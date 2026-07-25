import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  prisma,
  type Prisma,
} from "@enterprise/database";
import { UserRole } from "@enterprise/shared";

import { emailConfig } from "../../config/email.config.js";
import { emailService } from "../../integrations/email/email.service.js";
import { writeNotificationAudit } from "./notifications.audit.js";
import { notificationsRepository } from "./notifications.repository.js";

export type NotifyAudience =
  | { type: "INDIVIDUAL"; userId: string }
  | { type: "ROLE"; roleCode: string }
  | { type: "DEPARTMENT"; departmentId: string }
  | { type: "CLIENT_GROUP"; companyId: string };

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
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

async function resolveAudienceUserIds(audience: NotifyAudience): Promise<string[]> {
  switch (audience.type) {
    case "INDIVIDUAL":
      return [audience.userId];
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
        select: { email: true, firstName: true },
      });

      if (input.sendEmail !== false && preference.emailEnabled && user?.email) {
        const subject = input.title;
        await notificationsRepository.enqueue({
          notificationId,
          userId,
          channel: NotificationChannel.EMAIL,
          toAddress: user.email,
          subject,
          scheduledFor: input.scheduledFor,
          payload: {
            html: buildEmailHtml(input.title, input.body, input.linkUrl),
            text: buildEmailText(input.title, input.body, input.linkUrl),
            firstName: user.firstName,
          },
        });
        queued += 1;
      }

      // Architecture stubs for future providers — queued but not delivered yet.
      const extras = input.extraChannels ?? [];
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

          await notificationsRepository.enqueue({
            notificationId,
            userId,
            channel,
            scheduledFor: input.scheduledFor,
            payload: {
              title: input.title,
              body: input.body,
              provider: "NOT_INTEGRATED",
            },
          });
          queued += 1;
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
    return this.notify({
      title: interpolate(template.subject, vars),
      body: interpolate(template.bodyTemplate, vars),
      category: template.category,
      audience: input.audience,
      createdById: input.createdById,
      sendEmail: input.sendEmail ?? template.channels.includes(NotificationChannel.EMAIL),
      scheduledFor: input.scheduledFor,
    });
  }
}

export const notificationDispatcher = new NotificationDispatcher();

/** Process pending EMAIL queue items via Resend. Stubs leave PUSH/SMS/WhatsApp failed with reason. */
export async function processNotificationQueue(limit = 20): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const claimed = await notificationsRepository.claimPendingQueue(limit);
  let sent = 0;
  let failed = 0;

  for (const item of claimed) {
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
          await emailService.sendNotificationEmail({
            to: item.toAddress,
            subject: item.subject,
            html: payload.html ?? `<p>${item.subject}</p>`,
            text: payload.text ?? item.subject,
          });
          await notificationsRepository.markQueueSent(item.id);
          sent += 1;
          break;
        }
        case NotificationChannel.IN_APP: {
          await notificationsRepository.markQueueSent(item.id);
          sent += 1;
          break;
        }
        case NotificationChannel.PUSH:
        case NotificationChannel.SMS:
        case NotificationChannel.WHATSAPP: {
          await notificationsRepository.markQueueFailed(
            item.id,
            `${item.channel} provider not integrated yet`,
          );
          failed += 1;
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
    }
  }

  return { processed: claimed.length, sent, failed };
}
