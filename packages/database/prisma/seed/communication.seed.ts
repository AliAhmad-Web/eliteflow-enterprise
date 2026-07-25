import type { PrismaClient } from "../../src/generated/client";
import { seedLog } from "./utils/logger";

type Db = PrismaClient;

const DEMO_CONVERSATION_NAMES = [
  "General Team",
  "Engineering",
  "Management",
  "Client Support",
  "AI Discussion",
] as const;

/**
 * Phase 16 — Communication demo data.
 * Idempotent: upserts the five named group chats and backfills activities.
 */
export async function seedCommunication(db: Db): Promise<void> {
  seedLog("Seeding communication module...");

  const users = await db.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: { select: { code: true } },
    },
  });

  const superAdmins = users.filter((u) => u.role.code === "SUPER_ADMIN");
  const admins = users.filter((u) => u.role.code === "ADMIN");
  const employees = users.filter((u) => u.role.code === "EMPLOYEE");
  const clients = users.filter((u) => u.role.code === "CLIENT");

  // Prefer EliteFlow demo accounts as primary actors when present.
  const superAdmin =
    users.find((u) => u.email === "superadmin@eliteflow.dev") ??
    superAdmins[0];
  const admin =
    users.find((u) => u.email === "admin@eliteflow.dev") ?? admins[0];
  const employee =
    users.find((u) => u.email === "employee@eliteflow.dev") ?? employees[0];
  const client =
    users.find((u) => u.email === "client@eliteflow.dev") ?? clients[0];

  if (!superAdmin || !admin || !employee) {
    seedLog("Communication seed skipped (missing demo users).");
    return;
  }

  const uniqueIds = (ids: string[]) => [...new Set(ids)];
  const staffIds = uniqueIds([
    ...superAdmins.map((u) => u.id),
    ...admins.map((u) => u.id),
    ...employees.map((u) => u.id),
  ]);
  const allMemberIds = uniqueIds([
    ...staffIds,
    ...clients.map((u) => u.id),
  ]);

  const project = await db.project.findFirst({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  const companyClient = await db.client.findFirst({
    where: { deletedAt: null },
    select: { id: true, companyName: true },
  });
  const team = await db.team.findFirst({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  const department = await db.department.findFirst({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  const managedFile = await db.managedFile.findFirst({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  const task = await db.task.findFirst({
    where: { deletedAt: null },
    select: { id: true, title: true },
  });
  const invoice = await db.invoice.findFirst({
    where: { deletedAt: null },
    select: { id: true, invoiceNumber: true },
  });
  const calendarEvent = await db.calendarEvent.findFirst({
    where: { deletedAt: null },
    select: { id: true, title: true },
  });
  const aiDocument = await db.aiDocument.findFirst({
    where: { deletedAt: null },
    select: { id: true, title: true },
  });

  function linkMarker(
    type:
      | "PROJECT"
      | "TASK"
      | "INVOICE"
      | "CLIENT"
      | "CALENDAR"
      | "FILE"
      | "AI_DOCUMENT",
    id?: string | null,
  ) {
    return id ? `[[link:${type}:${id}]]\n` : "";
  }

  async function ensureConversation(input: {
    name: string;
    description: string;
    type: "GROUP" | "TEAM" | "DEPARTMENT" | "PROJECT" | "CLIENT";
    memberIds: string[];
    teamId?: string | null;
    departmentId?: string | null;
    projectId?: string | null;
    clientId?: string | null;
  }) {
    let conversation = await db.conversation.findFirst({
      where: { name: input.name, deletedAt: null },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          type: input.type,
          name: input.name,
          description: input.description,
          teamId: input.teamId ?? null,
          departmentId: input.departmentId ?? null,
          projectId: input.projectId ?? null,
          clientId: input.clientId ?? null,
          createdById: superAdmin!.id,
          updatedById: superAdmin!.id,
          lastMessageAt: new Date(),
          lastMessagePreview: "Conversation ready.",
        },
      });
    } else {
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          description: input.description,
          teamId: input.teamId ?? conversation.teamId,
          departmentId: input.departmentId ?? conversation.departmentId,
          projectId: input.projectId ?? conversation.projectId,
          clientId: input.clientId ?? conversation.clientId,
          updatedById: superAdmin!.id,
          deletedAt: null,
        },
      });
    }

    for (const [index, userId] of input.memberIds.entries()) {
      await db.conversationMember.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId,
          },
        },
        create: {
          conversationId: conversation.id,
          userId,
          role: index === 0 ? "OWNER" : "MEMBER",
          createdById: superAdmin!.id,
          updatedById: superAdmin!.id,
        },
        update: {
          deletedAt: null,
          leftAt: null,
          role: index === 0 ? "OWNER" : "MEMBER",
          updatedById: superAdmin!.id,
        },
      });
    }

    return conversation;
  }

  const general = await ensureConversation({
    name: "General Team",
    description: "Company-wide announcements and daily sync",
    type: "GROUP",
    memberIds: staffIds,
  });

  const engineering = await ensureConversation({
    name: "Engineering",
    description: "Sprint updates, PRs, and deployments",
    type: team ? "TEAM" : "GROUP",
    memberIds: staffIds,
    teamId: team?.id ?? null,
  });

  const management = await ensureConversation({
    name: "Management",
    description: "Leadership decisions and planning",
    type: department ? "DEPARTMENT" : "GROUP",
    memberIds: [superAdmin.id, admin.id],
    departmentId: department?.id ?? null,
  });

  const clientSupport = await ensureConversation({
    name: "Client Support",
    description: "Client portal support and escalations",
    type: companyClient ? "CLIENT" : "GROUP",
    memberIds: allMemberIds,
    clientId: companyClient?.id ?? null,
  });

  const aiDiscussion = await ensureConversation({
    name: "AI Discussion",
    description: "AI documents, assistants, and report reviews",
    type: project ? "PROJECT" : "GROUP",
    memberIds: staffIds,
    projectId: project?.id ?? null,
  });

  const conversations = [
    general,
    engineering,
    management,
    clientSupport,
    aiDiscussion,
  ];

  // Wipe and recreate demo messages for these conversations so seed is predictable.
  const conversationIds = conversations.map((c) => c.id);
  await db.messageReaction.deleteMany({
    where: { message: { conversationId: { in: conversationIds } } },
  });
  await db.messageRead.deleteMany({
    where: { message: { conversationId: { in: conversationIds } } },
  });
  await db.messageAttachment.deleteMany({
    where: { message: { conversationId: { in: conversationIds } } },
  });
  await db.message.deleteMany({
    where: { conversationId: { in: conversationIds } },
  });

  async function createMessage(input: {
    conversationId: string;
    senderId: string;
    body: string;
    parentId?: string;
    isPinned?: boolean;
    isEdited?: boolean;
    minutesAgo: number;
  }) {
    const createdAt = new Date(Date.now() - input.minutesAgo * 60_000);
    return db.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        body: input.body,
        kind: "TEXT",
        parentId: input.parentId,
        isPinned: input.isPinned ?? false,
        isEdited: input.isEdited ?? false,
        editedAt: input.isEdited ? createdAt : null,
        createdById: input.senderId,
        updatedById: input.senderId,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  // ---- General Team ----
  const g1 = await createMessage({
    conversationId: general.id,
    senderId: superAdmin.id,
    body: "Good morning everyone.",
    minutesAgo: 240,
    isPinned: true,
  });
  const g2 = await createMessage({
    conversationId: general.id,
    senderId: admin.id,
    body: `Morning @[${superAdmin.firstName}](${superAdmin.id}) — standup notes are ready.`,
    minutesAgo: 230,
  });
  const g3 = await createMessage({
    conversationId: general.id,
    senderId: employee.id,
    body: "Meeting moved to 3 PM.",
    parentId: g2.id,
    minutesAgo: 220,
  });
  const g4 = await createMessage({
    conversationId: general.id,
    senderId: admin.id,
    body: "Client approved the proposal.",
    minutesAgo: 180,
  });

  // ---- Engineering ----
  const e1 = await createMessage({
    conversationId: engineering.id,
    senderId: employee.id,
    body: "Please review PR #42.",
    minutesAgo: 300,
  });
  const e2 = await createMessage({
    conversationId: engineering.id,
    senderId: admin.id,
    body: "Looking now — left two comments.",
    parentId: e1.id,
    minutesAgo: 280,
  });
  const e3 = await createMessage({
    conversationId: engineering.id,
    senderId: employee.id,
    body: "API deployment completed.",
    minutesAgo: 200,
    isEdited: true,
  });
  const e4 = await createMessage({
    conversationId: engineering.id,
    senderId: superAdmin.id,
    body: "Nice work. Monitor error rates for the next hour.",
    parentId: e3.id,
    minutesAgo: 190,
  });

  // ---- Management ----
  const m1 = await createMessage({
    conversationId: management.id,
    senderId: superAdmin.id,
    body: "Q3 targets look healthy. Let's lock hiring plan Friday.",
    minutesAgo: 400,
  });
  const m2 = await createMessage({
    conversationId: management.id,
    senderId: admin.id,
    body: `${linkMarker("INVOICE", invoice?.id)}Invoice has been paid.`,
    minutesAgo: 350,
  });
  await createMessage({
    conversationId: management.id,
    senderId: superAdmin.id,
    body: "Great — update the board and notify finance.",
    parentId: m2.id,
    minutesAgo: 340,
  });

  // ---- Client Support ----
  const c1 = await createMessage({
    conversationId: clientSupport.id,
    senderId: admin.id,
    body: `${linkMarker("CLIENT", companyClient?.id)}How can we help you today?`,
    minutesAgo: 260,
  });
  if (client) {
    await createMessage({
      conversationId: clientSupport.id,
      senderId: client.id,
      body: "We need the latest proposal PDF and invoice status.",
      parentId: c1.id,
      minutesAgo: 250,
    });
  }
  await createMessage({
    conversationId: clientSupport.id,
    senderId: employee.id,
    body: `${linkMarker("FILE", managedFile?.id)}${linkMarker("INVOICE", invoice?.id)}Shared the files in File Manager and confirmed invoice paid.`,
    minutesAgo: 240,
  });

  // ---- AI Discussion ----
  const a1 = await createMessage({
    conversationId: aiDiscussion.id,
    senderId: admin.id,
    body: `${linkMarker("PROJECT", project?.id)}${linkMarker("AI_DOCUMENT", aiDocument?.id)}AI report generated successfully.`,
    minutesAgo: 160,
    isPinned: true,
  });
  await createMessage({
    conversationId: aiDiscussion.id,
    senderId: employee.id,
    body: `Reviewed @[${admin.firstName}](${admin.id}) — looks production-ready.`,
    parentId: a1.id,
    minutesAgo: 150,
  });
  await createMessage({
    conversationId: aiDiscussion.id,
    senderId: superAdmin.id,
    body: `${linkMarker("TASK", task?.id)}${linkMarker("CALENDAR", calendarEvent?.id)}Publish to AI Documents and share with the client.`,
    minutesAgo: 140,
  });

  const allMessages = await db.message.findMany({
    where: { conversationId: { in: conversationIds }, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  // Attachments
  if (allMessages[0]) {
    await db.messageAttachment.create({
      data: {
        messageId: allMessages[0].id,
        fileName: managedFile?.name ?? "standup-notes.pdf",
        fileUrl: "https://example.com/files/standup-notes.pdf",
        mimeType: "application/pdf",
        sizeBytes: 245_760,
        managedFileId: managedFile?.id ?? null,
        createdById: superAdmin.id,
      },
    });
  }
  if (e3) {
    await db.messageAttachment.create({
      data: {
        messageId: e3.id,
        fileName: "deploy-log.txt",
        fileUrl: "https://example.com/files/deploy-log.txt",
        mimeType: "text/plain",
        sizeBytes: 12_400,
        createdById: employee.id,
      },
    });
  }

  // Reactions
  const reactionPairs: Array<{ messageId: string; userId: string; emoji: string }> = [
    { messageId: g1.id, userId: admin.id, emoji: "👍" },
    { messageId: g1.id, userId: employee.id, emoji: "🎉" },
    { messageId: e3.id, userId: superAdmin.id, emoji: "🚀" },
    { messageId: e3.id, userId: admin.id, emoji: "✅" },
    { messageId: a1.id, userId: employee.id, emoji: "🔥" },
    { messageId: m2.id, userId: superAdmin.id, emoji: "💯" },
  ];
  for (const reaction of reactionPairs) {
    await db.messageReaction.create({ data: reaction });
  }

  // Read receipts
  for (const message of allMessages) {
    for (const userId of staffIds) {
      if (userId === message.senderId) continue;
      await db.messageRead.create({
        data: {
          messageId: message.id,
          userId,
          status: "SEEN",
          deliveredAt: message.createdAt,
          seenAt: new Date(message.createdAt.getTime() + 60_000),
        },
      });
    }
  }

  // Update conversation previews
  for (const conversationId of conversationIds) {
    const latest = await db.message.findFirst({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (latest) {
      await db.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: latest.createdAt,
          lastMessagePreview: latest.body.slice(0, 500),
        },
      });
    }
  }

  // Comments
  if (project) {
    const existingComment = await db.comment.findFirst({
      where: {
        entityType: "PROJECT",
        entityId: project.id,
        deletedAt: null,
        body: { contains: "Kickoff looks solid" },
      },
    });
    if (!existingComment) {
      const parent = await db.comment.create({
        data: {
          entityType: "PROJECT",
          entityId: project.id,
          authorId: admin.id,
          body: "Kickoff looks solid — let's track milestones here.",
          createdById: admin.id,
        },
      });
      await db.comment.create({
        data: {
          entityType: "PROJECT",
          entityId: project.id,
          authorId: employee.id,
          body: `Agreed @[${admin.firstName}](${admin.id}) — I'll update the timeline.`,
          parentId: parent.id,
          createdById: employee.id,
        },
      });
    }
  }

  // Presence
  for (const user of [superAdmin, admin, employee, client].filter(Boolean)) {
    if (!user) continue;
    await db.userPresence.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        isOnline: user.id === superAdmin.id || user.id === admin.id,
        lastSeenAt: new Date(),
      },
      update: {
        isOnline: user.id === superAdmin.id || user.id === admin.id,
        lastSeenAt: new Date(),
      },
    });
  }

  // Activities — ensure a rich feed (30–50)
  const activityCount = await db.activity.count({ where: { deletedAt: null } });
  if (activityCount < 30) {
    await db.activity.deleteMany({});

    const activitySeeds: Array<{
      action: string;
      title: string;
      body: string;
      entityType:
        | "CLIENT"
        | "PROJECT"
        | "TASK"
        | "INVOICE"
        | "CALENDAR"
        | "FILE"
        | "AI"
        | "NOTIFICATION"
        | "TEAM"
        | "MESSAGE"
        | "COMMENT"
        | "CONVERSATION"
        | "SYSTEM";
      entityId?: string | null;
      linkUrl: string;
      actorId: string;
      minutesAgo: number;
    }> = [
      {
        action: "CLIENT_CREATED",
        title: "Client Added",
        body: companyClient
          ? `Client "${companyClient.companyName}" was added`
          : "A new client was added",
        entityType: "CLIENT",
        entityId: companyClient?.id,
        linkUrl: "/clients",
        actorId: admin.id,
        minutesAgo: 500,
      },
      {
        action: "PROJECT_UPDATED",
        title: "Project Updated",
        body: project
          ? `Project "${project.name}" status was updated`
          : "A project was updated",
        entityType: "PROJECT",
        entityId: project?.id,
        linkUrl: "/projects",
        actorId: admin.id,
        minutesAgo: 480,
      },
      {
        action: "TASK_CREATED",
        title: "Task Created",
        body: "Task Assigned — Review onboarding checklist",
        entityType: "TASK",
        linkUrl: "/tasks",
        actorId: employee.id,
        minutesAgo: 460,
      },
      {
        action: "TASK_ASSIGNED",
        title: "Task Assigned",
        body: `${employee.firstName} was assigned a high-priority task`,
        entityType: "TASK",
        linkUrl: "/tasks",
        actorId: admin.id,
        minutesAgo: 450,
      },
      {
        action: "INVOICE_PAID",
        title: "Invoice Paid",
        body: "Invoice INV-1001 marked as paid",
        entityType: "INVOICE",
        linkUrl: "/invoices",
        actorId: admin.id,
        minutesAgo: 430,
      },
      {
        action: "CALENDAR_EVENT_CREATED",
        title: "Calendar Event",
        body: "Kickoff meeting scheduled for Friday 3 PM",
        entityType: "CALENDAR",
        linkUrl: "/calendar",
        actorId: admin.id,
        minutesAgo: 410,
      },
      {
        action: "FILE_UPLOADED",
        title: "File Uploaded",
        body: managedFile
          ? `File "${managedFile.name}" uploaded`
          : "Proposal PDF uploaded to File Manager",
        entityType: "FILE",
        entityId: managedFile?.id,
        linkUrl: "/file-manager",
        actorId: employee.id,
        minutesAgo: 390,
      },
      {
        action: "AI_DOCUMENT_CREATED",
        title: "AI Report Generated",
        body: "AI report generated successfully",
        entityType: "AI",
        linkUrl: "/ai-documents",
        actorId: admin.id,
        minutesAgo: 370,
      },
      {
        action: "NOTIFICATION_CREATED",
        title: "Notification Sent",
        body: "Reminder notification sent to project members",
        entityType: "NOTIFICATION",
        linkUrl: "/notifications",
        actorId: superAdmin.id,
        minutesAgo: 350,
      },
      {
        action: "TEAM_UPDATED",
        title: "Team Updated",
        body: team
          ? `Team "${team.name}" membership updated`
          : "Engineering team membership updated",
        entityType: "TEAM",
        entityId: team?.id,
        linkUrl: "/team",
        actorId: admin.id,
        minutesAgo: 330,
      },
      {
        action: "CONVERSATION_CREATED",
        title: "Conversation Created",
        body: "General Team chat was created",
        entityType: "CONVERSATION",
        entityId: general.id,
        linkUrl: "/messages",
        actorId: superAdmin.id,
        minutesAgo: 320,
      },
      {
        action: "MESSAGE_SENT",
        title: "Message Sent",
        body: "Good morning everyone.",
        entityType: "MESSAGE",
        entityId: g1.id,
        linkUrl: "/messages",
        actorId: superAdmin.id,
        minutesAgo: 240,
      },
      {
        action: "MESSAGE_PINNED",
        title: "Message Pinned",
        body: "Pinned standup message in General Team",
        entityType: "MESSAGE",
        entityId: g1.id,
        linkUrl: "/messages",
        actorId: superAdmin.id,
        minutesAgo: 235,
      },
      {
        action: "COMMENT_CREATED",
        title: "Comment Added",
        body: "New comment on project kickoff",
        entityType: "COMMENT",
        linkUrl: "/projects",
        actorId: admin.id,
        minutesAgo: 220,
      },
      {
        action: "INVOICE_SENT",
        title: "Invoice Sent",
        body: "Invoice INV-1002 sent to client",
        entityType: "INVOICE",
        linkUrl: "/invoices",
        actorId: admin.id,
        minutesAgo: 210,
      },
      {
        action: "PROJECT_CREATED",
        title: "Project Created",
        body: project
          ? `Project "${project.name}" created`
          : "New delivery project created",
        entityType: "PROJECT",
        entityId: project?.id,
        linkUrl: "/projects",
        actorId: admin.id,
        minutesAgo: 200,
      },
      {
        action: "TASK_COMPLETED",
        title: "Task Completed",
        body: "Onboarding checklist marked complete",
        entityType: "TASK",
        linkUrl: "/tasks",
        actorId: employee.id,
        minutesAgo: 190,
      },
      {
        action: "FILE_SHARED",
        title: "File Shared",
        body: "Shared proposal PDF with Client Support",
        entityType: "FILE",
        linkUrl: "/file-manager",
        actorId: employee.id,
        minutesAgo: 180,
      },
      {
        action: "CALENDAR_REMINDER",
        title: "Calendar Reminder",
        body: "Reminder: standup in 15 minutes",
        entityType: "CALENDAR",
        linkUrl: "/calendar",
        actorId: superAdmin.id,
        minutesAgo: 170,
      },
      {
        action: "AI_ASSISTANT_USED",
        title: "AI Assistant Used",
        body: "Generated meeting summary via AI Assistant",
        entityType: "AI",
        linkUrl: "/ai-assistant",
        actorId: admin.id,
        minutesAgo: 160,
      },
      {
        action: "REPORT_GENERATED",
        title: "Report Generated",
        body: "Weekly revenue report exported",
        entityType: "SYSTEM",
        linkUrl: "/reports",
        actorId: admin.id,
        minutesAgo: 150,
      },
      {
        action: "CLIENT_UPDATED",
        title: "Client Updated",
        body: "Client contact details refreshed",
        entityType: "CLIENT",
        entityId: companyClient?.id,
        linkUrl: "/clients",
        actorId: admin.id,
        minutesAgo: 140,
      },
      {
        action: "MESSAGE_REACTED",
        title: "Reaction Added",
        body: "🚀 reaction on deployment message",
        entityType: "MESSAGE",
        entityId: e3.id,
        linkUrl: "/messages",
        actorId: superAdmin.id,
        minutesAgo: 130,
      },
      {
        action: "NOTIFICATION_SENT",
        title: "Notification Sent",
        body: "Mention notification delivered",
        entityType: "NOTIFICATION",
        linkUrl: "/notifications",
        actorId: admin.id,
        minutesAgo: 120,
      },
      {
        action: "TEAM_MEMBER_ADDED",
        title: "Team Member Added",
        body: `${employee.firstName} joined Engineering`,
        entityType: "TEAM",
        entityId: team?.id,
        linkUrl: "/team",
        actorId: admin.id,
        minutesAgo: 110,
      },
      {
        action: "INVOICE_OVERDUE",
        title: "Invoice Overdue",
        body: "Invoice INV-0998 is past due",
        entityType: "INVOICE",
        linkUrl: "/invoices",
        actorId: systemActor(superAdmin.id),
        minutesAgo: 100,
      },
      {
        action: "PROJECT_MILESTONE",
        title: "Project Updated",
        body: "Milestone 'Discovery' marked complete",
        entityType: "PROJECT",
        entityId: project?.id,
        linkUrl: "/projects",
        actorId: admin.id,
        minutesAgo: 90,
      },
      {
        action: "TASK_BLOCKED",
        title: "Task Created",
        body: "Blocked task created for API dependency",
        entityType: "TASK",
        linkUrl: "/tasks",
        actorId: employee.id,
        minutesAgo: 80,
      },
      {
        action: "FILE_VERSION",
        title: "File Uploaded",
        body: "New version of branding assets uploaded",
        entityType: "FILE",
        linkUrl: "/file-manager",
        actorId: employee.id,
        minutesAgo: 70,
      },
      {
        action: "CALENDAR_UPDATED",
        title: "Calendar Event",
        body: "Client workshop rescheduled to next Tuesday",
        entityType: "CALENDAR",
        linkUrl: "/calendar",
        actorId: admin.id,
        minutesAgo: 60,
      },
      {
        action: "AI_DOC_PUBLISHED",
        title: "AI Report Generated",
        body: "Technical documentation published to AI Documents",
        entityType: "AI",
        linkUrl: "/ai-documents",
        actorId: superAdmin.id,
        minutesAgo: 50,
      },
      {
        action: "MESSAGE_EDITED",
        title: "Message Sent",
        body: "Deployment note edited in Engineering",
        entityType: "MESSAGE",
        entityId: e3.id,
        linkUrl: "/messages",
        actorId: employee.id,
        minutesAgo: 45,
      },
      {
        action: "COMMENT_REPLY",
        title: "Comment Added",
        body: "Reply posted on project discussion",
        entityType: "COMMENT",
        linkUrl: "/projects",
        actorId: employee.id,
        minutesAgo: 40,
      },
      {
        action: "SYSTEM_SYNC",
        title: "Notification Sent",
        body: "Activity feed sync completed",
        entityType: "SYSTEM",
        linkUrl: "/activity",
        actorId: superAdmin.id,
        minutesAgo: 30,
      },
      {
        action: "CONVERSATION_INVITE",
        title: "Conversation Created",
        body: "Client Support channel invitations sent",
        entityType: "CONVERSATION",
        entityId: clientSupport.id,
        linkUrl: "/messages",
        actorId: admin.id,
        minutesAgo: 25,
      },
      {
        action: "INVOICE_PAID",
        title: "Invoice Paid",
        body: "Retainer invoice settled successfully",
        entityType: "INVOICE",
        linkUrl: "/invoices",
        actorId: admin.id,
        minutesAgo: 20,
      },
      {
        action: "CLIENT_CREATED",
        title: "Client Added",
        body: "Prospect converted to active client",
        entityType: "CLIENT",
        linkUrl: "/clients",
        actorId: admin.id,
        minutesAgo: 15,
      },
      {
        action: "TASK_CREATED",
        title: "Task Created",
        body: "Follow-up task created after client call",
        entityType: "TASK",
        linkUrl: "/tasks",
        actorId: employee.id,
        minutesAgo: 10,
      },
      {
        action: "FILE_UPLOADED",
        title: "File Uploaded",
        body: "Signed SOW uploaded",
        entityType: "FILE",
        linkUrl: "/file-manager",
        actorId: admin.id,
        minutesAgo: 8,
      },
      {
        action: "AI_REPORT",
        title: "AI Report Generated",
        body: "Weekly insights report generated",
        entityType: "AI",
        linkUrl: "/ai-documents",
        actorId: admin.id,
        minutesAgo: 5,
      },
      {
        action: "NOTIFICATION_CREATED",
        title: "Notification Sent",
        body: "Digest notification delivered to managers",
        entityType: "NOTIFICATION",
        linkUrl: "/notifications",
        actorId: superAdmin.id,
        minutesAgo: 2,
      },
    ];

    for (const item of activitySeeds) {
      const createdAt = new Date(Date.now() - item.minutesAgo * 60_000);
      await db.activity.create({
        data: {
          actorId: item.actorId,
          action: item.action,
          title: item.title,
          body: item.body,
          entityType: item.entityType,
          entityId: item.entityId ?? null,
          linkUrl: item.linkUrl,
          createdById: item.actorId,
          updatedById: item.actorId,
          createdAt,
          updatedAt: createdAt,
        },
      });
    }
  }

  // ---- Phase 20 — Communication Hub demo (idempotent by title) ----
  const hubAnnouncementTitle = "Welcome to the Communication Hub";
  let announcement = await db.announcement.findFirst({
    where: { title: hubAnnouncementTitle, deletedAt: null },
  });
  if (!announcement) {
    announcement = await db.announcement.create({
      data: {
        title: hubAnnouncementTitle,
        body: "Pinned org-wide announcement for Phase 20 — check channels, threads, and meetings.",
        priority: "HIGH",
        isPinned: true,
        publishedAt: new Date(),
        departmentId: department?.id ?? null,
        createdById: superAdmin.id,
        updatedById: superAdmin.id,
      },
    });
  } else {
    await db.announcement.update({
      where: { id: announcement.id },
      data: {
        isPinned: true,
        deletedAt: null,
        updatedById: superAdmin.id,
      },
    });
  }

  const hubThreadTitle = "Phase 20 discussion kickoff";
  let thread = await db.discussionThread.findFirst({
    where: { title: hubThreadTitle, deletedAt: null },
  });
  if (!thread) {
    thread = await db.discussionThread.create({
      data: {
        title: hubThreadTitle,
        body: "How should we structure announcement vs channel updates?",
        category: "product",
        status: "OPEN",
        isPinned: false,
        departmentId: department?.id ?? null,
        teamId: team?.id ?? null,
        projectId: project?.id ?? null,
        createdById: admin.id,
        updatedById: admin.id,
        tags: {
          create: [{ tag: "phase-20" }, { tag: "comms" }],
        },
      },
    });
    await db.discussionReply.create({
      data: {
        threadId: thread.id,
        authorId: employee.id,
        body: `Good question @[${admin.firstName}](${admin.id}) — keep announcements for org-wide, channels for ongoing chat.`,
        createdById: employee.id,
        updatedById: employee.id,
      },
    });
  }

  const hubMeetingTitle = "Phase 20 architecture sync";
  let meeting = await db.meetingRoom.findFirst({
    where: { title: hubMeetingTitle, deletedAt: null },
  });
  if (!meeting) {
    const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    meeting = await db.meetingRoom.create({
      data: {
        title: hubMeetingTitle,
        description: "Scheduled demo meeting with host + one invitee.",
        status: "SCHEDULED",
        scheduledStart: start,
        scheduledEnd: end,
        waitingRoomEnabled: true,
        hostId: admin.id,
        createdById: admin.id,
        updatedById: admin.id,
        participants: {
          create: [
            { userId: admin.id, status: "INVITED", createdById: admin.id },
            { userId: employee.id, status: "INVITED", createdById: admin.id },
          ],
        },
      },
    });
  }

  const finalCounts = {
    conversations: await db.conversation.count({ where: { deletedAt: null } }),
    messages: await db.message.count({ where: { deletedAt: null } }),
    activities: await db.activity.count({ where: { deletedAt: null } }),
    announcements: await db.announcement.count({ where: { deletedAt: null } }),
    threads: await db.discussionThread.count({ where: { deletedAt: null } }),
    meetings: await db.meetingRoom.count({ where: { deletedAt: null } }),
    demoNames: DEMO_CONVERSATION_NAMES,
  };

  seedLog(
    `Communication seed completed: ${finalCounts.conversations} conversations, ${finalCounts.messages} messages, ${finalCounts.activities} activities, ${finalCounts.announcements} announcements, ${finalCounts.threads} threads, ${finalCounts.meetings} meetings.`,
  );
}

function systemActor(fallbackId: string): string {
  return fallbackId;
}
