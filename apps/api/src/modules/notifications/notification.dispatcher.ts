import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  prisma,
  type Prisma,
} from "@enterprise/database";
import { UserRole } from "@enterprise/shared";

import { emailConfig } from "../../config/email.config.js";
import { isWhatsappCloudConfigured } from "../../config/whatsapp.config.js";
import { emailService } from "../../integrations/email/email.service.js";
import {
  sendWhatsappCloudText,
  WhatsappDeliveryError,
  fetchWhatsappMessageStatus,
} from "../../integrations/whatsapp/whatsapp-cloud.sender.js";
import {
  isApiCommunicationEmailAutomationEnabled,
  isApiCommunicationEmailTemplatesEnabled,
  isApiCommunicationOrchestrationEnabled,
  isApiCommunicationWhatsappEnabled,
  isApiCommunicationWhatsappQueueEnabled,
} from "../../config/communication-flags.js";
import { isApiSaasBackgroundProcessingEnabled } from "../../config/saas-flags.js";
import {
  planNotificationQueueRetry,
  resolveNotificationQueueBatchSize,
} from "../../shared/services/saas-queue.helpers.js";
import { recordSaasNotificationQueueResult } from "../../shared/services/saas-metrics.service.js";
import {
  buildEmailQueueAutomationFields,
  buildWhatsappMessageBody,
  buildWhatsappQueuePayload,
  enhanceNotificationEmailHtml,
  whatsappProviderDeferredReason,
} from "./communication-channel.helpers.js";
import { writeNotificationAudit } from "./notifications.audit.js";
import { notificationsRepository } from "./notifications.repository.js";

export type NotifyAudience =
  | { type: "INDIVIDUAL"; userId: string }
  | { type: "ROLE"; roleCode: string }
  | { type: "DEPARTMENT"; departmentId: string }
  | { type: "CLIENT_GROUP"; companyId: string }
  | { type: "USER_LIST"; userIds: string[] };

export type NotifyInput = {
  title: string;
  body: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  linkUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  createdById?: string | null;
  sendEmail?: boolean;
  audience: NotifyAudience;
  scheduledFor?: Date;
  /** Prepared channels — PUSH/SMS/WHATSAPP queued as PENDING stubs only. */
  extraChannels?: NotificationChannel[];
  /** Optional HTML body for EMAIL queue (template enhancement). */
  emailHtmlOverride?: string | null;
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

async function resolveAudienceUserIds(audience: NotifyAudience): Promise<string[]> {
  switch (audience.type) {
    case "INDIVIDUAL":
      return [audience.userId];
    case "USER_LIST": {
      const unique = [...new Set(audience.userIds.filter(Boolean))];
      if (unique.length === 0) return [];
      const users = await prisma.user.findMany({
        where: { id: { in: unique }, deletedAt: null },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }
    case "ROLE": {
      const role = await prisma.role.findFirst({
        where: { code: audience.roleCode },
        select: { id: true },
      });
      if (!role) return [];
      const users = await prisma.user.findMany({
        where: { roleId: role.id, deletedAt: null },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }
    case "DEPARTMENT": {
      const profiles = await prisma.employeeProfile.findMany({
        where: { departmentId: audience.departmentId, deletedAt: null },
        select: { userId: true },
      });
      return profiles.map((p) => p.userId);
    }
    case "CLIENT_GROUP": {
      const users = await prisma.user.findMany({
        where: {
          companyId: audience.companyId,
          deletedAt: null,
          role: { code: UserRole.CLIENT },
        },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }
    default: {
      const _exhaustive: never = audience;
      return _exhaustive;
    }
  }
}

function buildEmailHtml(title: string, body: string, linkUrl?: string | null): string {
  const appName = emailConfig.appName;
  const link = linkUrl
    ? `<p><a href="${linkUrl}">Open in ${appName}</a></p>`
    : "";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <p><strong>${title}</strong></p>
      <p>${body}</p>
      ${link}
      <p style="color:#888;font-size:12px;">You received this because of your ${appName} notification preferences.</p>
    </div>
  `;
}

function buildEmailText(title: string, body: string, linkUrl?: string | null): string {
  return [title, "", body, linkUrl ? `\nOpen: ${linkUrl}` : ""].join("\n");
}

/**
 * Central notification dispatcher.
 * Creates in-app notifications (respecting preferences) and enqueues email /
 * future PUSH/SMS/WhatsApp deliveries. Does not modify Phase 1–14 modules.
 */
export class NotificationDispatcher {
  async notify(input: NotifyInput): Promise<{ created: number; queued: number }> {
    const userIds = await resolveAudienceUserIds(input.audience);
    let created = 0;
    let queued = 0;

    for (const userId of userIds) {
      const preference =
        (await notificationsRepository.getPreference(userId, input.category)) ??
        (await notificationsRepository.upsertPreference({
          userId,
          category: input.category,
        }));

      let notificationId: string | null = null;

      if (preference.inAppEnabled) {
        const notification = await notificationsRepository.create({
          userId,
          title: input.title,
          body: input.body,
          category: input.category,
          priority: input.priority ?? NotificationPriority.NORMAL,
          channel: NotificationChannel.IN_APP,
          linkUrl: input.linkUrl,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: input.metadata,
          createdById: input.createdById,
        });
        notificationId = notification.id;
        created += 1;

        await writeNotificationAudit({
          notificationId: notification.id,
          userId,
          action: "CREATED",
          metadata: { category: input.category, channel: "IN_APP" },
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, phone: true },
      });

      if (input.sendEmail !== false && preference.emailEnabled && user?.email) {
        const subject = input.title;
        const templatesEnabled = isApiCommunicationEmailTemplatesEnabled();
        const automationEnabled = isApiCommunicationEmailAutomationEnabled();
        const html = enhanceNotificationEmailHtml(
          input.emailHtmlOverride ??
            buildEmailHtml(input.title, input.body, input.linkUrl),
          templatesEnabled,
        );
        await notificationsRepository.enqueue({
          notificationId,
          userId,
          channel: NotificationChannel.EMAIL,
          toAddress: user.email,
          subject,
          scheduledFor: input.scheduledFor,
          payload: {
            html,
            text: buildEmailText(input.title, input.body, input.linkUrl),
            firstName: user.firstName,
            ...buildEmailQueueAutomationFields({
              automationEnabled,
              templatesEnabled,
            }),
          },
        });
        queued += 1;

        if (automationEnabled || isApiCommunicationOrchestrationEnabled()) {
          await writeNotificationAudit({
            notificationId,
            userId,
            action: "EMAIL_QUEUED",
            metadata: {
              channel: "EMAIL",
              automation: automationEnabled,
              templates: templatesEnabled,
            },
          });
        }
      }

      // PUSH/SMS stubs; WhatsApp uses Meta Cloud when configured.
      const extras = input.extraChannels ?? [];
      const whatsappChannelEnabled = isApiCommunicationWhatsappEnabled();
      const orchestrationEnabled = isApiCommunicationOrchestrationEnabled();
      const whatsappConfigured = isWhatsappCloudConfigured();

      for (const channel of extras) {
        if (
          channel === NotificationChannel.PUSH ||
          channel === NotificationChannel.SMS ||
          channel === NotificationChannel.WHATSAPP
        ) {
          const enabled =
            (channel === NotificationChannel.PUSH && preference.pushEnabled) ||
            (channel === NotificationChannel.SMS && preference.smsEnabled) ||
            (channel === NotificationChannel.WHATSAPP && preference.whatsappEnabled);

          if (!enabled) continue;

          const payload =
            channel === NotificationChannel.WHATSAPP && whatsappChannelEnabled
              ? (buildWhatsappQueuePayload({
                  title: input.title,
                  body: input.body,
                  orchestrationEnabled,
                }) as Prisma.InputJsonValue)
              : ({
                  title: input.title,
                  body: input.body,
                  provider: "NOT_INTEGRATED",
                } as Prisma.InputJsonValue);

          await notificationsRepository.enqueue({
            notificationId,
            userId,
            channel,
            toAddress:
              channel === NotificationChannel.WHATSAPP
                ? (user?.phone ?? null)
                : null,
            subject:
              channel === NotificationChannel.WHATSAPP ? input.title : null,
            scheduledFor: input.scheduledFor,
            payload,
          });
          queued += 1;

          if (
            channel === NotificationChannel.WHATSAPP &&
            (whatsappChannelEnabled || orchestrationEnabled)
          ) {
            await writeNotificationAudit({
              notificationId,
              userId,
              action: "WHATSAPP_QUEUED",
              metadata: {
                channel: "WHATSAPP",
                provider: whatsappConfigured ? "META_CLOUD" : "DEFERRED",
                deliveryState: whatsappConfigured
                  ? "queued"
                  : "provider_deferred",
                hasPhone: Boolean(user?.phone),
              },
            });
          }
        }
      }
    }

    return { created, queued };
  }

  async notifyFromTemplate(input: {
    templateCode: string;
    vars?: Record<string, string>;
    audience: NotifyAudience;
    createdById?: string | null;
    sendEmail?: boolean;
    scheduledFor?: Date;
  }) {
    const template = await prisma.notificationTemplate.findFirst({
      where: { code: input.templateCode, deletedAt: null },
    });
    if (!template) {
      throw new Error(`Notification template not found: ${input.templateCode}`);
    }

    const vars = input.vars ?? {};
    const templatesEnabled = isApiCommunicationEmailTemplatesEnabled();
    const emailHtmlOverride =
      templatesEnabled && template.emailTemplate
        ? interpolate(template.emailTemplate, vars)
        : null;
    return this.notify({
      title: interpolate(template.subject, vars),
      body: interpolate(template.bodyTemplate, vars),
      category: template.category,
      audience: input.audience,
      createdById: input.createdById,
      sendEmail: input.sendEmail ?? template.channels.includes(NotificationChannel.EMAIL),
      scheduledFor: input.scheduledFor,
      emailHtmlOverride,
      metadata: templatesEnabled
        ? { templateCode: input.templateCode, templateEnhanced: true }
        : undefined,
    });
  }
}

export const notificationDispatcher = new NotificationDispatcher();

/** Process pending EMAIL + WhatsApp queue items. PUSH/SMS remain stubs. */
export async function processNotificationQueue(
  limit = 20,
  options?: {
    budgetMs?: number;
    skipBatchScaling?: boolean;
    /** Prefer freshly queued mail on the send/create request path. */
    preferNewest?: boolean;
  },
): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const effectiveLimit = options?.skipBatchScaling
    ? Math.max(1, limit)
    : resolveNotificationQueueBatchSize(limit);
  const budgetMs = options?.budgetMs ?? 25_000;
  const deadline = Date.now() + budgetMs;
  const claimed = await notificationsRepository.claimPendingQueue(
    effectiveLimit,
    { order: options?.preferNewest ? "desc" : "asc" },
  );
  let sent = 0;
  let failed = 0;
  let cursor = 0;

  for (; cursor < claimed.length; cursor += 1) {
    if (Date.now() >= deadline) {
      break;
    }
    const item = claimed[cursor]!;
    try {
      switch (item.channel) {
        case NotificationChannel.EMAIL: {
          const payload = item.payload as {
            html?: string;
            text?: string;
          };
          if (!item.toAddress || !item.subject) {
            throw new Error("Missing email address or subject");
          }
          const remaining = Math.max(1_000, deadline - Date.now());
          await Promise.race([
            emailService.sendNotificationEmail({
              to: item.toAddress,
              subject: item.subject,
              html: payload.html ?? `<p>${item.subject}</p>`,
              text: payload.text ?? item.subject,
            }),
            new Promise<never>((_, reject) => {
              setTimeout(() => {
                reject(new Error(`Email provider timeout after ${remaining}ms`));
              }, Math.min(remaining, 35_000));
            }),
          ]);
          await notificationsRepository.markQueueSent(item.id);
          sent += 1;
          if (
            isApiCommunicationEmailAutomationEnabled() ||
            isApiCommunicationOrchestrationEnabled()
          ) {
            await writeNotificationAudit({
              notificationId: item.notificationId,
              userId: item.userId,
              action: "EMAIL_SENT",
              metadata: {
                queueId: item.id,
                channel: "EMAIL",
                deliveryState: "sent",
                toAddress: item.toAddress,
              },
            });
          }
          break;
        }
        case NotificationChannel.IN_APP: {
          await notificationsRepository.markQueueSent(item.id);
          sent += 1;
          break;
        }
        case NotificationChannel.PUSH:
        case NotificationChannel.SMS: {
          await notificationsRepository.markQueueFailed(
            item.id,
            `${item.channel} provider not integrated yet`,
          );
          failed += 1;
          break;
        }
        case NotificationChannel.WHATSAPP: {
          const queueEnabled = isApiCommunicationWhatsappQueueEnabled();
          if (!isWhatsappCloudConfigured()) {
            await notificationsRepository.markQueueFailed(
              item.id,
              queueEnabled
                ? whatsappProviderDeferredReason()
                : `${item.channel} provider not integrated yet`,
            );
            if (queueEnabled || isApiCommunicationOrchestrationEnabled()) {
              await writeNotificationAudit({
                notificationId: item.notificationId,
                userId: item.userId,
                action: "WHATSAPP_PROVIDER_DEFERRED",
                metadata: {
                  queueId: item.id,
                  retryPrepared: true,
                  deliveryState: "provider_deferred",
                },
              });
            }
            failed += 1;
            break;
          }

          if (!item.toAddress) {
            throw new Error(
              "Missing WhatsApp destination — set user.phone before sending",
            );
          }

          const payload = item.payload as {
            title?: string;
            body?: string;
          };
          const messageBody = buildWhatsappMessageBody({
            title: payload.title ?? item.subject ?? undefined,
            body: payload.body,
          });

          const { messageId } = await sendWhatsappCloudText({
            to: item.toAddress,
            body: messageBody,
          });

          let deliveryStatus:
            | "sent"
            | "delivered"
            | "read"
            | "failed"
            | "unknown" = "sent";
          if (messageId) {
            deliveryStatus = await fetchWhatsappMessageStatus(messageId);
          }

          if (deliveryStatus === "failed") {
            throw new WhatsappDeliveryError(
              "WhatsApp provider reported failed delivery status",
              `messageId=${messageId ?? "unknown"}`,
            );
          }

          await notificationsRepository.markQueueSent(item.id);
          sent += 1;

          await writeNotificationAudit({
            notificationId: item.notificationId,
            userId: item.userId,
            action:
              deliveryStatus === "read"
                ? "WHATSAPP_READ"
                : deliveryStatus === "delivered"
                  ? "WHATSAPP_DELIVERED"
                  : "WHATSAPP_SENT",
            metadata: {
              queueId: item.id,
              channel: "WHATSAPP",
              provider: "META_CLOUD",
              messageId,
              deliveryState: deliveryStatus,
              toAddress: item.toAddress,
              retryPrepared: true,
            },
          });
          break;
        }
        default: {
          await notificationsRepository.markQueueFailed(
            item.id,
            `Unknown channel: ${String(item.channel)}`,
          );
          failed += 1;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Queue processing failed";
      await notificationsRepository.markQueueFailed(item.id, message);
      failed += 1;

      if (
        item.channel === NotificationChannel.EMAIL &&
        (isApiCommunicationEmailAutomationEnabled() ||
          isApiCommunicationOrchestrationEnabled())
      ) {
        await writeNotificationAudit({
          notificationId: item.notificationId,
          userId: item.userId,
          action: "EMAIL_FAILED",
          metadata: {
            queueId: item.id,
            channel: "EMAIL",
            deliveryState: "failed",
            error: message,
          },
        });
      }

      if (
        item.channel === NotificationChannel.WHATSAPP &&
        (isApiCommunicationWhatsappQueueEnabled() ||
          isApiCommunicationOrchestrationEnabled())
      ) {
        await writeNotificationAudit({
          notificationId: item.notificationId,
          userId: item.userId,
          action: "WHATSAPP_FAILED",
          metadata: {
            queueId: item.id,
            channel: "WHATSAPP",
            deliveryState: "failed",
            error: message,
            retryPrepared: true,
          },
        });
      }

      if (isApiSaasBackgroundProcessingEnabled()) {
        const plan = planNotificationQueueRetry({
          attempts: item.attempts + 1,
          lastError: message,
        });
        await writeNotificationAudit({
          notificationId: item.notificationId,
          userId: item.userId,
          action: "QUEUE_RETRY_PLANNED",
          metadata: {
            queueId: item.id,
            shouldRetry: plan.shouldRetry,
            delayMs: plan.delayMs,
            reason: plan.reason,
          },
        });
      }
    }
  }

  const unprocessed = claimed.slice(cursor);
  if (unprocessed.length > 0) {
    await notificationsRepository.releaseQueueToPending(
      unprocessed.map((item) => item.id),
    );
  }

  const result = { processed: sent + failed, sent, failed };
  recordSaasNotificationQueueResult(result);
  return result;
}
