import {
  InvoiceStatus,
  LeaveRequestStatus,
  NotificationCategory,
  NotificationPriority,
  prisma,
  TaskStatus,
} from "@enterprise/database";

import { notificationDispatcher } from "./notification.dispatcher.js";

/**
 * Scans ERP data and emits due/overdue/reminder notifications without modifying
 * Phase 1–14 modules. Safe to call from an admin process endpoint or cron.
 */
export async function runNotificationTriggers(createdById?: string): Promise<{
  emitted: number;
}> {
  let emitted = 0;
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const dueToday = await prisma.task.findMany({
    where: {
      deletedAt: null,
      dueDate: { gte: startOfDay, lte: endOfDay },
      status: { not: TaskStatus.COMPLETED },
      assignedToId: { not: null },
    },
    select: { id: true, title: true, assignedToId: true },
    take: 50,
  });

  for (const task of dueToday) {
    if (!task.assignedToId) continue;
    const result = await notificationDispatcher.notify({
      title: "Task due today",
      body: `"${task.title}" is due today.`,
      category: NotificationCategory.TASK,
      priority: NotificationPriority.HIGH,
      linkUrl: `/tasks/${task.id}`,
      entityType: "Task",
      entityId: task.id,
      audience: { type: "INDIVIDUAL", userId: task.assignedToId },
      createdById,
      sendEmail: true,
    });
    emitted += result.created;
  }

  const overdue = await prisma.task.findMany({
    where: {
      deletedAt: null,
      dueDate: { lt: startOfDay },
      status: { not: TaskStatus.COMPLETED },
      assignedToId: { not: null },
    },
    select: { id: true, title: true, assignedToId: true },
    take: 50,
  });

  for (const task of overdue) {
    if (!task.assignedToId) continue;
    const result = await notificationDispatcher.notify({
      title: "Task overdue",
      body: `"${task.title}" is past its due date.`,
      category: NotificationCategory.TASK,
      priority: NotificationPriority.URGENT,
      linkUrl: `/tasks/${task.id}`,
      entityType: "Task",
      entityId: task.id,
      audience: { type: "INDIVIDUAL", userId: task.assignedToId },
      createdById,
      sendEmail: true,
    });
    emitted += result.created;
  }

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      dueDate: { lt: startOfDay },
      status: {
        in: [InvoiceStatus.SENT, InvoiceStatus.PENDING, InvoiceStatus.OVERDUE],
      },
    },
    select: { id: true, invoiceNumber: true, clientId: true },
    take: 50,
  });

  for (const invoice of overdueInvoices) {
    const clientUsers = await prisma.user.findMany({
      where: { companyId: invoice.clientId, deletedAt: null },
      select: { id: true },
      take: 10,
    });
    for (const user of clientUsers) {
      const result = await notificationDispatcher.notify({
        title: "Invoice overdue",
        body: `Invoice ${invoice.invoiceNumber} is overdue.`,
        category: NotificationCategory.INVOICE,
        priority: NotificationPriority.URGENT,
        linkUrl: `/invoices/${invoice.id}`,
        entityType: "Invoice",
        entityId: invoice.id,
        audience: { type: "INDIVIDUAL", userId: user.id },
        createdById,
        sendEmail: true,
      });
      emitted += result.created;
    }
  }

  const windowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const upcomingEvents = await prisma.calendarEvent.findMany({
    where: {
      deletedAt: null,
      startsAt: { gte: now, lte: windowEnd },
      reminders: { some: { sentAt: null } },
    },
    include: {
      reminders: { where: { sentAt: null } },
      attendees: { select: { userId: true } },
    },
    take: 50,
  });

  for (const event of upcomingEvents) {
    for (const reminder of event.reminders) {
      const remindAt = new Date(
        event.startsAt.getTime() - reminder.minutesBefore * 60 * 1000,
      );
      if (remindAt > now) continue;

      const userIds = new Set<string>();
      if (event.createdById) userIds.add(event.createdById);
      for (const attendee of event.attendees) {
        userIds.add(attendee.userId);
      }

      for (const userId of userIds) {
        const result = await notificationDispatcher.notify({
          title: "Calendar reminder",
          body: `"${event.title}" starts soon.`,
          category: NotificationCategory.CALENDAR,
          priority: NotificationPriority.HIGH,
          linkUrl: `/calendar?event=${event.id}`,
          entityType: "CalendarEvent",
          entityId: event.id,
          audience: { type: "INDIVIDUAL", userId },
          createdById,
          sendEmail: true,
        });
        emitted += result.created;
      }

      await prisma.eventReminder.update({
        where: { id: reminder.id },
        data: { sentAt: now },
      });
    }
  }

  const pendingLeaves = await prisma.leaveRequest.count({
    where: { status: LeaveRequestStatus.PENDING, deletedAt: null },
  });
  if (pendingLeaves > 0) {
    const result = await notificationDispatcher.notify({
      title: "Leave requests pending",
      body: `${pendingLeaves} leave request(s) awaiting review.`,
      category: NotificationCategory.TEAM,
      priority: NotificationPriority.NORMAL,
      linkUrl: "/team",
      audience: { type: "ROLE", roleCode: "ADMIN" },
      createdById,
      sendEmail: false,
    });
    emitted += result.created;
  }

  return { emitted };
}
