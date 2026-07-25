import type { PrismaClient } from "../../src/generated/client";
import {
  CalendarEventCategory,
  CalendarEventStatus,
  CalendarEventType,
  EventAttendeeStatus,
  RecurrenceFrequency,
  ReminderChannel,
} from "../../src/generated/client";

import { seedLog } from "./utils/logger";

export async function seedCalendar(prisma: PrismaClient): Promise<void> {
  seedLog("Seeding calendar sample data...");

  const admin = await prisma.user.findUnique({
    where: { email: "admin@eliteflow.dev" },
    select: { id: true },
  });
  const employee = await prisma.user.findUnique({
    where: { email: "employee@eliteflow.dev" },
    select: { id: true },
  });
  const clientUser = await prisma.user.findUnique({
    where: { email: "client@eliteflow.dev" },
    select: { id: true, companyId: true },
  });

  if (!admin || !employee) {
    seedLog("  ⚠ Demo users missing — skipping calendar seed");
    return;
  }

  const project = await prisma.project.findFirst({
    where: { deletedAt: null },
    select: { id: true, clientId: true },
  });
  const task = await prisma.task.findFirst({
    where: { deletedAt: null, dueDate: { not: null } },
    select: { id: true, title: true, dueDate: true, projectId: true },
  });

  const existingHoliday = await prisma.holiday.findFirst({
    where: { name: "Company Founding Day", deletedAt: null },
  });

  if (!existingHoliday) {
    await prisma.holiday.create({
      data: {
        name: "Company Founding Day",
        date: new Date("2026-07-01"),
        description: "EliteFlow company holiday",
        isCompanyWide: true,
        createdById: admin.id,
      },
    });
    seedLog("  ✓ Created holiday Company Founding Day");
  } else {
    seedLog("  ✓ Holiday already exists");
  }

  const existingKickoff = await prisma.calendarEvent.findFirst({
    where: { title: "Weekly Team Sync", deletedAt: null },
  });

  if (existingKickoff) {
    seedLog("  ✓ Calendar events already seeded");
    return;
  }

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0),
  );
  const endOfToday = new Date(startOfToday.getTime() + 60 * 60 * 1000);

  const teamSync = await prisma.calendarEvent.create({
    data: {
      title: "Weekly Team Sync",
      description: "Standing meeting for project status and blockers.",
      notes: "Bring sprint board updates.",
      location: "Conference Room A",
      type: CalendarEventType.MEETING,
      status: CalendarEventStatus.CONFIRMED,
      category: CalendarEventCategory.TEAM,
      color: "#0f766e",
      startsAt: startOfToday,
      endsAt: endOfToday,
      recurrenceFrequency: RecurrenceFrequency.WEEKLY,
      recurrenceInterval: 1,
      recurrenceCount: 12,
      projectId: project?.id,
      clientId: project?.clientId ?? clientUser?.companyId,
      createdById: admin.id,
      updatedById: admin.id,
      attendees: {
        create: [
          { userId: admin.id, status: EventAttendeeStatus.ACCEPTED },
          { userId: employee.id, status: EventAttendeeStatus.PENDING },
          ...(clientUser
            ? [
                {
                  userId: clientUser.id,
                  status: EventAttendeeStatus.PENDING,
                  isOptional: true,
                },
              ]
            : []),
        ],
      },
      reminders: {
        create: [
          {
            channel: ReminderChannel.IN_APP,
            minutesBefore: 15,
            createdById: admin.id,
          },
          {
            channel: ReminderChannel.EMAIL,
            minutesBefore: 60,
            createdById: admin.id,
          },
        ],
      },
    },
  });
  seedLog(`  ✓ Created event ${teamSync.title}`);

  const personalReminder = await prisma.calendarEvent.create({
    data: {
      title: "Submit timesheet",
      description: "Personal reminder to submit weekly timesheet.",
      type: CalendarEventType.REMINDER,
      status: CalendarEventStatus.SCHEDULED,
      category: CalendarEventCategory.PERSONAL,
      color: "#7c3aed",
      startsAt: new Date(startOfToday.getTime() + 5 * 60 * 60 * 1000),
      endsAt: new Date(startOfToday.getTime() + 5.5 * 60 * 60 * 1000),
      isPrivate: true,
      createdById: employee.id,
      updatedById: employee.id,
      reminders: {
        create: [
          {
            channel: ReminderChannel.IN_APP,
            minutesBefore: 30,
            createdById: employee.id,
          },
        ],
      },
    },
  });
  seedLog(`  ✓ Created event ${personalReminder.title}`);

  if (project) {
    const deadline = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 5, 17, 0, 0),
    );
    await prisma.calendarEvent.create({
      data: {
        title: "Project Milestone Deadline",
        description: "Delivery checkpoint for current project phase.",
        type: CalendarEventType.PROJECT_DEADLINE,
        status: CalendarEventStatus.SCHEDULED,
        category: CalendarEventCategory.PROJECT,
        color: "#dc2626",
        startsAt: deadline,
        endsAt: new Date(deadline.getTime() + 60 * 60 * 1000),
        allDay: false,
        projectId: project.id,
        clientId: project.clientId,
        createdById: admin.id,
        updatedById: admin.id,
        attendees: {
          create: [
            { userId: admin.id, status: EventAttendeeStatus.ACCEPTED },
            { userId: employee.id, status: EventAttendeeStatus.ACCEPTED },
          ],
        },
      },
    });
    seedLog("  ✓ Created project deadline event");
  }

  if (task?.dueDate) {
    const dueStart = new Date(task.dueDate);
    dueStart.setUTCHours(9, 0, 0, 0);
    await prisma.calendarEvent.create({
      data: {
        title: `Task due: ${task.title}`,
        type: CalendarEventType.TASK_DUE,
        status: CalendarEventStatus.SCHEDULED,
        category: CalendarEventCategory.WORK,
        color: "#ea580c",
        startsAt: dueStart,
        endsAt: new Date(dueStart.getTime() + 60 * 60 * 1000),
        taskId: task.id,
        projectId: task.projectId,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    seedLog("  ✓ Created task due-date event");
  }

  const clientBriefingStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2, 14, 0, 0),
  );
  await prisma.calendarEvent.create({
    data: {
      title: "Client Progress Briefing",
      description: "Shared review of deliverables with the client.",
      location: "Zoom",
      type: CalendarEventType.MEETING,
      status: CalendarEventStatus.SCHEDULED,
      category: CalendarEventCategory.CLIENT,
      color: "#2563eb",
      startsAt: clientBriefingStart,
      endsAt: new Date(clientBriefingStart.getTime() + 45 * 60 * 1000),
      clientId: clientUser?.companyId ?? project?.clientId,
      createdById: admin.id,
      updatedById: admin.id,
      attachmentUrls: ["https://example.com/agenda.pdf"],
      attendees: {
        create: [
          { userId: admin.id, status: EventAttendeeStatus.ACCEPTED },
          ...(clientUser
            ? [{ userId: clientUser.id, status: EventAttendeeStatus.PENDING }]
            : []),
        ],
      },
      reminders: {
        create: [
          {
            channel: ReminderChannel.EMAIL,
            minutesBefore: 120,
            createdById: admin.id,
          },
        ],
      },
    },
  });
  seedLog("  ✓ Created client briefing event");
}
