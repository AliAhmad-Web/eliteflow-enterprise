/**
 * Phase 2 attachment verification: ManagedFile-backed request attachments,
 * company isolation, and addAttachment path.
 *
 *   npx tsx --env-file=apps/api/.env apps/api/scripts/verify-customer-requests-attachments.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  FileCategory,
  prisma,
  UserStatus,
} from "@enterprise/database";
import {
  FILES_API_PREFIX,
  UserRole,
  buildInternalManagedFileDownloadPath,
} from "@enterprise/shared";

import { authRepository } from "../src/modules/auth/auth.repository.js";
import { ensurePortalCompanyLink } from "../src/modules/clients/client-company-onboarding.service.js";
import {
  CUSTOMER_REQUESTS_ERROR_CODES,
  CustomerRequestsError,
} from "../src/modules/customer-requests/customer-requests.errors.js";
import { customerRequestsService } from "../src/modules/customer-requests/customer-requests.service.js";
import { FILES_ERROR_CODES, FilesError } from "../src/modules/files/files.errors.js";

const RUN_ID = randomUUID().slice(0, 8);
const PREFIX = `verify.p2.attach.${RUN_ID}`;

function email(local: string) {
  return `${PREFIX}.${local}@eliteflow.test`;
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true, companyId: true },
  });
  const companyIds = [
    ...new Set(users.map((u) => u.companyId).filter(Boolean) as string[]),
  ];

  const requests = await prisma.customerRequest.findMany({
    where: {
      OR: [
        { createdById: { in: users.map((u) => u.id) } },
        { clientId: { in: companyIds } },
      ],
    },
    select: { id: true },
  });
  const requestIds = requests.map((r) => r.id);
  if (requestIds.length) {
    await prisma.customerRequestAttachment.deleteMany({
      where: { requestId: { in: requestIds } },
    });
    await prisma.customerRequest.deleteMany({
      where: { id: { in: requestIds } },
    });
  }

  if (companyIds.length) {
    await prisma.managedFile.deleteMany({
      where: { clientId: { in: companyIds } },
    });
  }

  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: { companyId: null },
    });
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  if (companyIds.length) {
    await prisma.client.deleteMany({ where: { id: { in: companyIds } } });
  }
}

async function createClientUser(local: string) {
  const clientRole = await authRepository.getDefaultClientRole();
  const user = await authRepository.createUser({
    email: email(local),
    passwordHash: null,
    firstName: "Attach",
    lastName: local,
    roleId: clientRole.id,
    status: UserStatus.ACTIVE,
    emailVerified: true,
  });
  await ensurePortalCompanyLink(user.id, { userId: user.id });
  const linked = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { id: true, email: true, companyId: true },
  });
  assert.ok(linked.companyId);
  return {
    userId: linked.id,
    email: linked.email,
    companyId: linked.companyId!,
    role: UserRole.CLIENT,
  };
}

async function createManagedFile(params: {
  clientId: string;
  createdById: string;
  name: string;
}) {
  return prisma.managedFile.create({
    data: {
      name: params.name,
      originalName: params.name,
      mimeType: "text/plain",
      extension: "txt",
      sizeBytes: BigInt(12),
      category: FileCategory.TEXT,
      storageKey: `verify/${PREFIX}/${params.name}`,
      storageProvider: "local",
      clientId: params.clientId,
      createdById: params.createdById,
    },
  });
}

async function main() {
  console.log(`[p2-attach] RUN_ID=${RUN_ID}`);
  await cleanup();

  const clientA = await createClientUser("a");
  const clientB = await createClientUser("b");

  const fileA = await createManagedFile({
    clientId: clientA.companyId,
    createdById: clientA.userId,
    name: `scope-a-${RUN_ID}.txt`,
  });
  const fileB = await createManagedFile({
    clientId: clientB.companyId,
    createdById: clientB.userId,
    name: `scope-b-${RUN_ID}.txt`,
  });

  // Create with secure managed attachment
  const created = await customerRequestsService.create(
    {
      type: "NEW_PROJECT",
      title: `Attach create ${RUN_ID}`,
      description: "with file",
      submit: false,
      attachments: [
        {
          fileName: fileA.originalName,
          fileUrl: `${"http://localhost:4000"}${FILES_API_PREFIX}/${fileA.id}/download`,
          managedFileId: fileA.id,
          mimeType: fileA.mimeType,
          sizeBytes: Number(fileA.sizeBytes),
        },
      ],
    },
    clientA,
  );
  assert.equal(created.attachments.length, 1);
  assert.equal(created.attachments[0]?.managedFileId, fileA.id);
  assert.equal(
    created.attachments[0]?.fileUrl,
    buildInternalManagedFileDownloadPath(fileA.id),
  );
  assert.equal(created.clientId, clientA.companyId);
  console.log("[p2-attach] create with ManagedFile OK");

  // Cross-company managed file rejected
  try {
    await customerRequestsService.create(
      {
        type: "GENERAL_SERVICE",
        title: `Cross file ${RUN_ID}`,
        description: "should fail",
        submit: false,
        attachments: [
          {
            fileName: fileB.originalName,
            managedFileId: fileB.id,
            fileUrl: buildInternalManagedFileDownloadPath(fileB.id),
          },
        ],
      },
      clientA,
    );
    assert.fail("cross-company managedFileId should be rejected");
  } catch (error) {
    assert.ok(
      error instanceof FilesError || error instanceof CustomerRequestsError,
      "expected FilesError or CustomerRequestsError",
    );
    if (error instanceof FilesError) {
      assert.ok(
        error.code === FILES_ERROR_CODES.FORBIDDEN ||
          error.code === FILES_ERROR_CODES.NOT_FOUND ||
          error.code === FILES_ERROR_CODES.VALIDATION,
      );
    }
  }
  console.log("[p2-attach] cross-company file rejected OK");

  // addAttachment on editable draft
  const extra = await createManagedFile({
    clientId: clientA.companyId,
    createdById: clientA.userId,
    name: `extra-${RUN_ID}.txt`,
  });
  const updated = await customerRequestsService.addAttachment(
    created.id,
    {
      fileName: extra.originalName,
      managedFileId: extra.id,
      fileUrl: buildInternalManagedFileDownloadPath(extra.id),
      mimeType: extra.mimeType,
      sizeBytes: Number(extra.sizeBytes),
    },
    clientA,
  );
  assert.equal(updated.attachments.length, 2);
  assert.ok(updated.attachments.some((a) => a.managedFileId === extra.id));
  console.log("[p2-attach] addAttachment OK");

  // Client B cannot attach to A's request
  try {
    await customerRequestsService.addAttachment(
      created.id,
      {
        fileName: fileB.originalName,
        managedFileId: fileB.id,
        fileUrl: buildInternalManagedFileDownloadPath(fileB.id),
      },
      clientB,
    );
    assert.fail("IDOR addAttachment should fail");
  } catch (error) {
    assert.ok(error instanceof CustomerRequestsError);
    assert.equal(error.code, CUSTOMER_REQUESTS_ERROR_CODES.NOT_FOUND);
  }
  console.log("[p2-attach] IDOR addAttachment blocked OK");

  await cleanup();
  console.log("[p2-attach] PASS");
}

main()
  .catch(async (error) => {
    console.error("[p2-attach] FAIL", error);
    try {
      await cleanup();
    } catch {
      // ignore
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
