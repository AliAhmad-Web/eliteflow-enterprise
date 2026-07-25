import type { PrismaClient } from "../../src/generated/client";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from "../../src/generated/client";

import { seedLog } from "./utils/logger";

const TEMPLATES: Array<{
  code: string;
  name: string;
  category: NotificationCategory;
  subject: string;
  bodyTemplate: string;
}> = [
  {
    code: "AUTH_LOGIN",
    name: "Login Alert",
    category: NotificationCategory.AUTH,
    subject: "New sign-in to EliteFlow",
    bodyTemplate: "A new login was detected for {{email}}.",
  },
  {
    code: "AUTH_PASSWORD_CHANGED",
    name: "Password Changed",
    category: NotificationCategory.SECURITY,
    subject: "Your password was changed",
    bodyTemplate: "Your EliteFlow password was changed successfully.",
  },
  {
    code: "AUTH_EMAIL_VERIFIED",
    name: "Email Verified",
    category: NotificationCategory.AUTH,
    subject: "Email verified",
    bodyTemplate: "Your email address has been verified.",
  },
  {
    code: "PROJECT_CREATED",
    name: "Project Created",
    category: NotificationCategory.PROJECT,
    subject: "Project created: {{name}}",
    bodyTemplate: "Project {{name}} was created.",
  },
  {
    code: "PROJECT_UPDATED",
    name: "Project Updated",
    category: NotificationCategory.PROJECT,
    subject: "Project updated: {{name}}",
    bodyTemplate: "Project {{name}} was updated.",
  },
  {
    code: "PROJECT_MEMBER_ASSIGNED",
    name: "Project Member Assigned",
    category: NotificationCategory.PROJECT,
    subject: "Added to project {{name}}",
    bodyTemplate: "You were assigned to project {{name}}.",
  },
  {
    code: "PROJECT_MILESTONE_COMPLETED",
    name: "Milestone Completed",
    category: NotificationCategory.PROJECT,
    subject: "Milestone completed on {{name}}",
    bodyTemplate: "A milestone was completed on project {{name}}.",
  },
  {
    code: "TASK_ASSIGNED",
    name: "Task Assigned",
    category: NotificationCategory.TASK,
    subject: "Task assigned: {{title}}",
    bodyTemplate: "You were assigned task {{title}}.",
  },
  {
    code: "TASK_STATUS_CHANGED",
    name: "Task Status Changed",
    category: NotificationCategory.TASK,
    subject: "Task status updated",
    bodyTemplate: "Task {{title}} moved to {{status}}.",
  },
  {
    code: "TASK_DUE_TODAY",
    name: "Task Due Today",
    category: NotificationCategory.TASK,
    subject: "Task due today: {{title}}",
    bodyTemplate: "Task {{title}} is due today.",
  },
  {
    code: "TASK_OVERDUE",
    name: "Task Overdue",
    category: NotificationCategory.TASK,
    subject: "Task overdue: {{title}}",
    bodyTemplate: "Task {{title}} is overdue.",
  },
  {
    code: "INVOICE_CREATED",
    name: "Invoice Created",
    category: NotificationCategory.INVOICE,
    subject: "Invoice {{number}} created",
    bodyTemplate: "Invoice {{number}} has been created.",
  },
  {
    code: "INVOICE_PAID",
    name: "Invoice Paid",
    category: NotificationCategory.INVOICE,
    subject: "Invoice {{number}} paid",
    bodyTemplate: "Invoice {{number}} was marked as paid.",
  },
  {
    code: "INVOICE_OVERDUE",
    name: "Invoice Overdue",
    category: NotificationCategory.INVOICE,
    subject: "Invoice {{number}} overdue",
    bodyTemplate: "Invoice {{number}} is overdue.",
  },
  {
    code: "CALENDAR_MEETING_REMINDER",
    name: "Meeting Reminder",
    category: NotificationCategory.CALENDAR,
    subject: "Meeting reminder: {{title}}",
    bodyTemplate: "Meeting {{title}} starts soon.",
  },
  {
    code: "CALENDAR_EVENT_REMINDER",
    name: "Event Reminder",
    category: NotificationCategory.CALENDAR,
    subject: "Event reminder: {{title}}",
    bodyTemplate: "Event {{title}} starts soon.",
  },
  {
    code: "CALENDAR_INVITE_ACCEPTED",
    name: "Invitation Accepted",
    category: NotificationCategory.CALENDAR,
    subject: "Invitation accepted",
    bodyTemplate: "{{name}} accepted your invitation to {{title}}.",
  },
  {
    code: "CALENDAR_INVITE_DECLINED",
    name: "Invitation Declined",
    category: NotificationCategory.CALENDAR,
    subject: "Invitation declined",
    bodyTemplate: "{{name}} declined your invitation to {{title}}.",
  },
  {
    code: "FILE_SHARED",
    name: "File Shared",
    category: NotificationCategory.FILE,
    subject: "File shared with you",
    bodyTemplate: "{{name}} shared {{file}} with you.",
  },
  {
    code: "FILE_UPLOADED",
    name: "New Upload",
    category: NotificationCategory.FILE,
    subject: "New file uploaded",
    bodyTemplate: "{{file}} was uploaded.",
  },
  {
    code: "FILE_DELETED",
    name: "File Deleted",
    category: NotificationCategory.FILE,
    subject: "File deleted",
    bodyTemplate: "{{file}} was deleted.",
  },
  {
    code: "FILE_NEW_VERSION",
    name: "New File Version",
    category: NotificationCategory.FILE,
    subject: "New version available",
    bodyTemplate: "A new version of {{file}} is available.",
  },
  {
    code: "TEAM_LEAVE_APPROVED",
    name: "Leave Approved",
    category: NotificationCategory.TEAM,
    subject: "Leave request approved",
    bodyTemplate: "Your leave request was approved.",
  },
  {
    code: "TEAM_LEAVE_REJECTED",
    name: "Leave Rejected",
    category: NotificationCategory.TEAM,
    subject: "Leave request rejected",
    bodyTemplate: "Your leave request was rejected.",
  },
  {
    code: "TEAM_PERFORMANCE_REVIEW",
    name: "Performance Review",
    category: NotificationCategory.TEAM,
    subject: "Performance review available",
    bodyTemplate: "A performance review is ready for you.",
  },
  {
    code: "TEAM_GOAL_ASSIGNED",
    name: "Goal Assigned",
    category: NotificationCategory.TEAM,
    subject: "New goal assigned",
    bodyTemplate: "You were assigned goal: {{title}}.",
  },
  {
    code: "AI_DOCUMENT_GENERATED",
    name: "AI Document Generated",
    category: NotificationCategory.AI,
    subject: "AI document ready",
    bodyTemplate: "Your AI document {{title}} is ready.",
  },
  {
    code: "AI_SUMMARY_READY",
    name: "AI Summary Ready",
    category: NotificationCategory.AI,
    subject: "AI summary ready",
    bodyTemplate: "Your AI summary is ready to review.",
  },
  {
    code: "SYSTEM_ANNOUNCEMENT",
    name: "System Announcement",
    category: NotificationCategory.SYSTEM,
    subject: "System announcement",
    bodyTemplate: "{{message}}",
  },
];

type SeedNotification = {
  email: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  linkUrl?: string;
  isRead?: boolean;
};

const SAMPLE_NOTIFICATIONS: SeedNotification[] = [
  {
    email: "admin@eliteflow.dev",
    title: "New sign-in detected",
    body: "Login from Operations console at headquarters IP.",
    category: NotificationCategory.AUTH,
    priority: NotificationPriority.NORMAL,
    linkUrl: "/settings/security",
  },
  {
    email: "admin@eliteflow.dev",
    title: "Project created: Atlas Redesign",
    body: "A new project was created in the portfolio.",
    category: NotificationCategory.PROJECT,
    priority: NotificationPriority.NORMAL,
    linkUrl: "/projects",
  },
  {
    email: "admin@eliteflow.dev",
    title: "Invoice INV-1001 paid",
    body: "Client payment was recorded successfully.",
    category: NotificationCategory.INVOICE,
    priority: NotificationPriority.HIGH,
    linkUrl: "/invoices",
    isRead: true,
  },
  {
    email: "employee@eliteflow.dev",
    title: "Task assigned: Prepare sprint board",
    body: "You were assigned a new delivery task.",
    category: NotificationCategory.TASK,
    priority: NotificationPriority.HIGH,
    linkUrl: "/tasks",
  },
  {
    email: "employee@eliteflow.dev",
    title: "Task due today",
    body: "Complete API contract review before EOD.",
    category: NotificationCategory.TASK,
    priority: NotificationPriority.URGENT,
    linkUrl: "/tasks",
  },
  {
    email: "employee@eliteflow.dev",
    title: "Meeting reminder: Team sync",
    body: "Team sync starts in 15 minutes.",
    category: NotificationCategory.CALENDAR,
    priority: NotificationPriority.HIGH,
    linkUrl: "/calendar",
  },
  {
    email: "employee@eliteflow.dev",
    title: "Leave request approved",
    body: "Your annual leave request was approved.",
    category: NotificationCategory.TEAM,
    priority: NotificationPriority.NORMAL,
    linkUrl: "/team",
    isRead: true,
  },
  {
    email: "employee@eliteflow.dev",
    title: "Goal assigned: Q3 delivery excellence",
    body: "A new performance goal was assigned to you.",
    category: NotificationCategory.TEAM,
    priority: NotificationPriority.NORMAL,
    linkUrl: "/team",
  },
  {
    email: "employee@eliteflow.dev",
    title: "File shared with you",
    body: "Admin shared Brand Guidelines.pdf.",
    category: NotificationCategory.FILE,
    priority: NotificationPriority.NORMAL,
    linkUrl: "/file-manager",
  },
  {
    email: "employee@eliteflow.dev",
    title: "AI summary ready",
    body: "Your weekly project summary is ready.",
    category: NotificationCategory.AI,
    priority: NotificationPriority.NORMAL,
    linkUrl: "/ai-documents",
  },
  {
    email: "client@eliteflow.dev",
    title: "Invoice created",
    body: "A new invoice is available in your portal.",
    category: NotificationCategory.INVOICE,
    priority: NotificationPriority.HIGH,
    linkUrl: "/invoices",
  },
  {
    email: "client@eliteflow.dev",
    title: "New file uploaded",
    body: "A deliverable was uploaded to your shared folder.",
    category: NotificationCategory.FILE,
    priority: NotificationPriority.NORMAL,
    linkUrl: "/file-manager",
  },
  {
    email: "client@eliteflow.dev",
    title: "Invitation accepted",
    body: "Your briefing invitation was accepted by the team.",
    category: NotificationCategory.CALENDAR,
    priority: NotificationPriority.NORMAL,
    linkUrl: "/calendar",
    isRead: true,
  },
  {
    email: "superadmin@eliteflow.dev",
    title: "Security notice",
    body: "Platform audit log retention policy updated.",
    category: NotificationCategory.SECURITY,
    priority: NotificationPriority.HIGH,
    linkUrl: "/admin",
  },
  {
    email: "superadmin@eliteflow.dev",
    title: "System announcement",
    body: "Phase 15 Notification Center is live.",
    category: NotificationCategory.SYSTEM,
    priority: NotificationPriority.NORMAL,
  },
];

export async function seedNotifications(prisma: PrismaClient): Promise<void> {
  seedLog("Seeding notification templates, preferences & samples...");

  const admin = await prisma.user.findUnique({
    where: { email: "admin@eliteflow.dev" },
    select: { id: true },
  });

  for (const template of TEMPLATES) {
    const existing = await prisma.notificationTemplate.findUnique({
      where: { code: template.code },
    });
    if (!existing) {
      await prisma.notificationTemplate.create({
        data: {
          code: template.code,
          name: template.name,
          category: template.category,
          subject: template.subject,
          bodyTemplate: template.bodyTemplate,
          emailTemplate: `<p>${template.bodyTemplate}</p>`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          isSystem: true,
          createdById: admin?.id ?? null,
        },
      });
      seedLog(`  ✓ Template ${template.code}`);
    }
  }

  const demoEmails = [
    "admin@eliteflow.dev",
    "employee@eliteflow.dev",
    "client@eliteflow.dev",
    "superadmin@eliteflow.dev",
  ];

  for (const email of demoEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) continue;

    for (const category of Object.values(NotificationCategory)) {
      await prisma.notificationPreference.upsert({
        where: {
          userId_category: { userId: user.id, category },
        },
        create: {
          userId: user.id,
          category,
          inAppEnabled: true,
          emailEnabled: category !== NotificationCategory.SYSTEM,
          pushEnabled: false,
          smsEnabled: false,
          whatsappEnabled: false,
        },
        update: {},
      });
    }
  }

  for (const sample of SAMPLE_NOTIFICATIONS) {
    const user = await prisma.user.findUnique({
      where: { email: sample.email },
      select: { id: true },
    });
    if (!user) continue;

    const existing = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        title: sample.title,
        deletedAt: null,
      },
    });
    if (existing) continue;

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        title: sample.title,
        body: sample.body,
        category: sample.category,
        priority: sample.priority,
        channel: NotificationChannel.IN_APP,
        linkUrl: sample.linkUrl ?? null,
        isRead: sample.isRead ?? false,
        readAt: sample.isRead ? new Date() : null,
        createdById: admin?.id ?? null,
      },
    });

    await prisma.notificationAudit.create({
      data: {
        notificationId: notification.id,
        userId: user.id,
        action: "SEEDED",
        metadata: { category: sample.category },
      },
    });

    // Seed a pending email queue item for a subset (architecture demo)
    if (
      sample.category === NotificationCategory.TASK ||
      sample.category === NotificationCategory.INVOICE
    ) {
      const recipient = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      });
      await prisma.notificationQueue.create({
        data: {
          notificationId: notification.id,
          userId: user.id,
          channel: NotificationChannel.EMAIL,
          toAddress: recipient?.email ?? sample.email,
          subject: sample.title,
          payload: {
            html: `<p>${sample.body}</p>`,
            text: sample.body,
            provider: "resend",
          },
          scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
    }

    seedLog(`  ✓ Notification → ${sample.email}: ${sample.title}`);
  }
}
