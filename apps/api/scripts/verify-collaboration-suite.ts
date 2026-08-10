/**
 * Collaboration suite verification: isolation + attachment security + whiteboard scope.
 *
 * Run:
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-collaboration-suite.ts
 */
import assert from "node:assert/strict";

import { prisma } from "@enterprise/database";
import {
  PERMISSIONS,
  UserRole,
  hasForbiddenAttachmentUrlScheme,
  parseInternalManagedFileId,
} from "@enterprise/shared";

import { attachmentSecurityService } from "../src/modules/files/attachment-security.service.js";
import { FilesError } from "../src/modules/files/files.errors.js";
import { calendarService } from "../src/modules/calendar/calendar.service.js";
import { CalendarError } from "../src/modules/calendar/calendar.errors.js";
import { whiteboardsService } from "../src/modules/whiteboards/whiteboards.service.js";
import { WhiteboardsError } from "../src/modules/whiteboards/whiteboards.errors.js";
import { communicationService } from "../src/modules/communication/communication.service.js";
import { CommunicationError } from "../src/modules/communication/communication.errors.js";

async function expectDenied(
  fn: () => Promise<unknown>,
  label: string,
): Promise<void> {
  let denied = false;
  try {
    await fn();
  } catch (error) {
    denied =
      error instanceof CalendarError ||
      error instanceof WhiteboardsError ||
      error instanceof CommunicationError ||
      error instanceof FilesError ||
      (error instanceof Error &&
        (error.message.includes("not found") ||
          error.message.includes("denied") ||
          error.message.includes("Permission")));
  }
  assert.ok(denied, `expected denial: ${label}`);
}

async function main() {
  // ---- Attachment URL scheme guards (pure) ----
  assert.equal(hasForbiddenAttachmentUrlScheme("data:text/plain,hi"), true);
  assert.equal(hasForbiddenAttachmentUrlScheme("javascript:alert(1)"), true);
  assert.equal(hasForbiddenAttachmentUrlScheme("https://example.com/a.pdf"), false);
  assert.equal(
    parseInternalManagedFileId(
      "/api/v1/files/11111111-1111-4111-8111-111111111111/download",
    ),
    "11111111-1111-4111-8111-111111111111",
  );

  const admin = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      role: { code: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] } },
    },
    select: {
      id: true,
      email: true,
      companyId: true,
      role: { select: { code: true } },
    },
  });
  assert.ok(admin, "admin required");

  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    select: { id: true },
    take: 2,
    orderBy: { createdAt: "asc" },
  });
  assert.ok(clients.length >= 2, "need >=2 clients");
  const [clientA, clientB] = clients;
  assert.ok(clientA && clientB);

  const portalA = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      companyId: clientA.id,
      role: { code: UserRole.CLIENT },
    },
    select: { id: true, email: true, companyId: true, role: { select: { code: true } } },
  });
  const portalB = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      companyId: clientB.id,
      role: { code: UserRole.CLIENT },
    },
    select: { id: true, email: true, companyId: true, role: { select: { code: true } } },
  });

  const adminActor = {
    userId: admin.id,
    email: admin.email,
    role: admin.role.code,
    companyId: admin.companyId,
    permissions: ["*"],
    ipAddress: "127.0.0.1",
    userAgent: "verify-collaboration-suite",
  };

  // ---- Attachment security service rejects forbidden schemes ----
  await expectDenied(
    () =>
      attachmentSecurityService.secureAttachments(
        [
          {
            fileName: "evil.txt",
            fileUrl: "data:text/plain;base64,YWJj",
          },
        ],
        adminActor,
      ),
    "data: attachment",
  );
  await expectDenied(
    () =>
      attachmentSecurityService.secureAttachments(
        [
          {
            fileName: "xss.txt",
            fileUrl: "javascript:alert(1)",
          },
        ],
        adminActor,
      ),
    "javascript: attachment",
  );

  // ---- Calendar: CLIENT cannot write ----
  if (portalA) {
    await expectDenied(
      () =>
        calendarService.createEvent(
          {
            title: "Should fail",
            type: "MEETING",
            status: "SCHEDULED",
            category: "WORK",
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 3600_000).toISOString(),
            allDay: false,
            isPrivate: false,
          },
          {
            userId: portalA.id,
            email: portalA.email,
            role: portalA.role.code,
            companyId: portalA.companyId,
            permissions: [PERMISSIONS.CALENDAR_READ],
          },
        ),
      "CLIENT calendar write",
    );
  }

  // ---- Whiteboard company isolation ----
  const boardA = await whiteboardsService.create(
    {
      title: `verify-collab-a-${Date.now()}`,
      clientId: clientA.id,
    },
    adminActor,
  );

  if (portalB) {
    await expectDenied(
      () =>
        whiteboardsService.getById(boardA.id, {
          userId: portalB.id,
          email: portalB.email,
          role: portalB.role.code,
          companyId: portalB.companyId,
          permissions: [
            PERMISSIONS.WHITEBOARDS_READ,
            PERMISSIONS.WHITEBOARDS_WRITE,
          ],
        }),
      "Company B reading Company A whiteboard",
    );
  }

  if (portalA) {
    // Client A may read board linked to their company
    const visible = await whiteboardsService.getById(boardA.id, {
      userId: portalA.id,
      email: portalA.email,
      role: portalA.role.code,
      companyId: portalA.companyId,
      permissions: [PERMISSIONS.WHITEBOARDS_READ],
    });
    assert.equal(visible.id, boardA.id);
  }

  await whiteboardsService.remove(boardA.id, adminActor);

  // ---- Chat: non-member cannot list messages (direct-ID isolation) ----
  const conv = await prisma.conversation.findFirst({
    where: { deletedAt: null },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });
  if (conv && portalB) {
    await expectDenied(
      () =>
        communicationService.listMessages(
          conv.id,
          { page: 1, pageSize: 10 },
          {
            userId: portalB.id,
            email: portalB.email,
            role: portalB.role.code,
            companyId: portalB.companyId,
            permissions: [PERMISSIONS.CHAT_READ],
          },
        ),
      "non-member conversation messages",
    );
  }

  // ---- Audit presence for whiteboard create/delete ----
  const wbAudit = await prisma.auditLog.count({
    where: {
      resource: "whiteboards",
      action: { in: ["whiteboards.create", "whiteboards.delete"] },
      createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
    },
  });
  assert.ok(wbAudit >= 1, "expected whiteboard audit events");

  console.log("COLLABORATION_SUITE_VERIFY_OK");
}

main()
  .catch((error) => {
    console.error("COLLABORATION_SUITE_VERIFY_FAIL", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
