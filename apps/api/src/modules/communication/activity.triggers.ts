import { prisma } from "@enterprise/database";

import { communicationRepository } from "./communication.repository.js";

/**
 * Scans ERP tables and creates Activity rows for recent domain events that
 * are not yet mirrored in the activity feed. Does NOT modify any Phase 1–15
 * modules. Safe to call from an admin endpoint or a scheduled cron.
 */
export async function runActivityTriggers(actorId?: string): Promise<{
  created: number;
}> {
  let created = 0;
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // last year window

  // ---- Clients -------------------------------------------------------------

  const recentClients = await prisma.client.findMany({
    where: { deletedAt: null, createdAt: { gte: since } },
    select: { id: true, companyName: true, status: true, createdAt: true },
    take: 50,
  });

  for (const client of recentClients) {
    const exists = await communicationRepository.activityExists({
      action: "CLIENT_CREATED",
      entityType: "CLIENT",
      entityId: client.id,
      since,
    });
    if (!exists) {
      await communicationRepository.createActivity({
        actorId: actorId ?? null,
        action: "CLIENT_CREATED",
        title: `Client "${client.companyName}" added`,
        entityType: "CLIENT",
        entityId: client.id,
        linkUrl: `/clients`,
        metadata: { status: client.status },
        createdById: actorId ?? null,
      });
      created++;
    }
  }

  // ---- Projects ------------------------------------------------------------

  const recentProjects = await prisma.project.findMany({
    where: { deletedAt: null, createdAt: { gte: since } },
    select: { id: true, name: true, status: true, createdAt: true },
    take: 50,
  });

  for (const project of recentProjects) {
    const exists = await communicationRepository.activityExists({
      action: "PROJECT_CREATED",
      entityType: "PROJECT",
      entityId: project.id,
      since,
    });
    if (!exists) {
      await communicationRepository.createActivity({
        actorId: actorId ?? null,
        action: "PROJECT_CREATED",
        title: `Project "${project.name}" created`,
        entityType: "PROJECT",
        entityId: project.id,
        linkUrl: `/projects/${project.id}`,
        metadata: { status: project.status },
        createdById: actorId ?? null,
      });
      created++;
    }
  }

  // ---- Tasks ---------------------------------------------------------------

  const recentTasks = await prisma.task.findMany({
    where: { deletedAt: null, createdAt: { gte: since } },
    select: { id: true, title: true, status: true, createdAt: true },
    take: 50,
  });

  for (const task of recentTasks) {
    const exists = await communicationRepository.activityExists({
      action: "TASK_CREATED",
      entityType: "TASK",
      entityId: task.id,
      since,
    });
    if (!exists) {
      await communicationRepository.createActivity({
        actorId: actorId ?? null,
        action: "TASK_CREATED",
        title: `Task "${task.title}" created`,
        entityType: "TASK",
        entityId: task.id,
        linkUrl: `/tasks/${task.id}`,
        metadata: { status: task.status },
        createdById: actorId ?? null,
      });
      created++;
    }
  }

  // ---- Invoices ------------------------------------------------------------

  const recentInvoices = await prisma.invoice.findMany({
    where: { deletedAt: null, createdAt: { gte: since } },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      createdAt: true,
    },
    take: 50,
  });

  for (const invoice of recentInvoices) {
    const exists = await communicationRepository.activityExists({
      action: "INVOICE_CREATED",
      entityType: "INVOICE",
      entityId: invoice.id,
      since,
    });
    if (!exists) {
      await communicationRepository.createActivity({
        actorId: actorId ?? null,
        action: "INVOICE_CREATED",
        title: `Invoice ${invoice.invoiceNumber} created`,
        entityType: "INVOICE",
        entityId: invoice.id,
        linkUrl: `/invoices/${invoice.id}`,
        metadata: { status: invoice.status },
        createdById: actorId ?? null,
      });
      created++;
    }
  }

  // ---- Files ---------------------------------------------------------------

  const recentFiles = await prisma.managedFile.findMany({
    where: { deletedAt: null, createdAt: { gte: since } },
    select: { id: true, name: true, createdAt: true },
    take: 50,
  });

  for (const file of recentFiles) {
    const exists = await communicationRepository.activityExists({
      action: "FILE_UPLOADED",
      entityType: "FILE",
      entityId: file.id,
      since,
    });
    if (!exists) {
      await communicationRepository.createActivity({
        actorId: actorId ?? null,
        action: "FILE_UPLOADED",
        title: `File "${file.name}" uploaded`,
        entityType: "FILE",
        entityId: file.id,
        linkUrl: `/file-manager`,
        createdById: actorId ?? null,
      });
      created++;
    }
  }

  // ---- Calendar events -----------------------------------------------------

  const recentEvents = await prisma.calendarEvent.findMany({
    where: { deletedAt: null, createdAt: { gte: since } },
    select: { id: true, title: true, startsAt: true, createdAt: true },
    take: 50,
  });

  for (const event of recentEvents) {
    const exists = await communicationRepository.activityExists({
      action: "CALENDAR_EVENT_CREATED",
      entityType: "CALENDAR",
      entityId: event.id,
      since,
    });
    if (!exists) {
      await communicationRepository.createActivity({
        actorId: actorId ?? null,
        action: "CALENDAR_EVENT_CREATED",
        title: `Event "${event.title}" scheduled`,
        entityType: "CALENDAR",
        entityId: event.id,
        linkUrl: `/calendar?event=${event.id}`,
        metadata: { startsAt: event.startsAt.toISOString() },
        createdById: actorId ?? null,
      });
      created++;
    }
  }

  // ---- AI Documents --------------------------------------------------------

  const recentAiDocs = await prisma.aiDocument.findMany({
    where: { deletedAt: null, createdAt: { gte: since } },
    select: { id: true, title: true, type: true, createdAt: true },
    take: 50,
  });

  for (const doc of recentAiDocs) {
    const exists = await communicationRepository.activityExists({
      action: "AI_DOCUMENT_CREATED",
      entityType: "AI",
      entityId: doc.id,
      since,
    });
    if (!exists) {
      await communicationRepository.createActivity({
        actorId: actorId ?? null,
        action: "AI_DOCUMENT_CREATED",
        title: `AI document "${doc.title}" generated`,
        entityType: "AI",
        entityId: doc.id,
        linkUrl: `/ai-documents`,
        metadata: { type: doc.type },
        createdById: actorId ?? null,
      });
      created++;
    }
  }

  // ---- Notifications (system events) ---------------------------------------

  const recentNotifications = await prisma.notification.findMany({
    where: { deletedAt: null, createdAt: { gte: since } },
    select: {
      id: true,
      title: true,
      category: true,
      createdAt: true,
      userId: true,
    },
    take: 50,
  });

  for (const notif of recentNotifications) {
    const exists = await communicationRepository.activityExists({
      action: "NOTIFICATION_CREATED",
      entityType: "NOTIFICATION",
      entityId: notif.id,
      since,
    });
    if (!exists) {
      await communicationRepository.createActivity({
        actorId: actorId ?? null,
        action: "NOTIFICATION_CREATED",
        title: notif.title,
        entityType: "NOTIFICATION",
        entityId: notif.id,
        metadata: { category: notif.category, userId: notif.userId },
        createdById: actorId ?? null,
      });
      created++;
    }
  }

  return { created };
}
