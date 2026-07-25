import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { PrismaClient } from "../../src/generated/client";
import {
  FileCategory,
  FileShareAccess,
} from "../../src/generated/client";

import { seedLog } from "./utils/logger";

const seedRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../apps/api/storage/uploads",
);

export async function seedFiles(prisma: PrismaClient): Promise<void> {
  seedLog("Seeding file manager sample data...");

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
    seedLog("  ⚠ Demo users missing — skipping files seed");
    return;
  }

  const existing = await prisma.folder.findFirst({
    where: { name: "Company Docs", deletedAt: null },
  });

  let rootFolder = existing;
  if (!rootFolder) {
    rootFolder = await prisma.folder.create({
      data: {
        name: "Company Docs",
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    seedLog("  ✓ Created folder Company Docs");
  } else {
    seedLog("  ✓ Folder Company Docs already exists");
  }

  const proposals = await prisma.folder.findFirst({
    where: {
      name: "Proposals",
      parentId: rootFolder.id,
      deletedAt: null,
    },
  });

  let proposalsFolder = proposals;
  if (!proposalsFolder) {
    proposalsFolder = await prisma.folder.create({
      data: {
        name: "Proposals",
        parentId: rootFolder.id,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    seedLog("  ✓ Created folder Proposals");
  }

  const sampleFiles = [
    {
      name: "welcome.txt",
      originalName: "welcome.txt",
      mimeType: "text/plain",
      extension: "txt",
      category: FileCategory.TEXT,
      folderId: rootFolder.id,
      createdById: admin.id,
      isFavorite: true,
      tags: ["onboarding", "docs"],
      content: "Welcome to EliteFlow File Manager.\n",
    },
    {
      name: "acme-kickoff-notes.txt",
      originalName: "acme-kickoff-notes.txt",
      mimeType: "text/plain",
      extension: "txt",
      category: FileCategory.TEXT,
      folderId: proposalsFolder!.id,
      createdById: employee.id,
      isFavorite: false,
      tags: ["acme", "meeting"],
      content: "Acme kickoff notes (seed).\n",
    },
  ] as const;

  for (const sample of sampleFiles) {
    const found = await prisma.managedFile.findFirst({
      where: {
        name: sample.name,
        folderId: sample.folderId,
        deletedAt: null,
      },
    });

    if (found) {
      seedLog(`  ✓ File ${sample.name} already exists`);
      continue;
    }

    const storageKey = `seed/${sample.name}`;
    const sizeBytes = BigInt(Buffer.byteLength(sample.content, "utf8"));

    const file = await prisma.managedFile.create({
      data: {
        folderId: sample.folderId,
        name: sample.name,
        originalName: sample.originalName,
        mimeType: sample.mimeType,
        extension: sample.extension,
        sizeBytes,
        category: sample.category,
        storageKey,
        storageProvider: "local",
        checksum: "seed",
        tags: [...sample.tags],
        isFavorite: sample.isFavorite,
        createdById: sample.createdById,
        updatedById: sample.createdById,
        version: 1,
        clientId: clientUser?.companyId ?? null,
      },
    });

    await prisma.fileVersion.create({
      data: {
        fileId: file.id,
        version: 1,
        storageKey,
        sizeBytes,
        mimeType: sample.mimeType,
        createdById: sample.createdById,
        note: "Seed version",
      },
    });

    await prisma.fileActivity.create({
      data: {
        fileId: file.id,
        actorId: sample.createdById,
        action: "UPLOADED",
      },
    });

    const full = path.join(seedRoot, storageKey);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, sample.content, "utf8");

    seedLog(`  ✓ Created file ${sample.name}`);
  }

  if (clientUser?.companyId) {
    const shared = await prisma.managedFile.findFirst({
      where: { name: "welcome.txt", deletedAt: null },
    });
    if (shared) {
      const existingShare = await prisma.fileShare.findFirst({
        where: {
          fileId: shared.id,
          sharedWithClientId: clientUser.companyId,
        },
      });
      if (!existingShare) {
        await prisma.fileShare.create({
          data: {
            fileId: shared.id,
            sharedWithClientId: clientUser.companyId,
            access: FileShareAccess.DOWNLOAD,
            createdById: admin.id,
          },
        });
        seedLog("  ✓ Shared welcome.txt with client company");
      }
    }
  }
}
