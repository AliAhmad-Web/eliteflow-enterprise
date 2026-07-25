import type { PrismaClient } from "../../../src/generated/client";

import {
  AI_CONVERSATION_SEED_DATA,
  AI_DOCUMENT_SEED_DATA,
} from "./data/ai.data";
import { seedLog } from "./utils/logger";

export async function seedAi(prisma: PrismaClient): Promise<void> {
  seedLog("Seeding AI conversations & documents...");

  for (const conversation of AI_CONVERSATION_SEED_DATA) {
    const user = await prisma.user.findUnique({
      where: { email: conversation.ownerEmail },
      select: { id: true },
    });

    if (!user) {
      seedLog(`  ⚠ User missing for conversation ${conversation.title}`);
      continue;
    }

    const existing = await prisma.aiConversation.findFirst({
      where: {
        userId: user.id,
        title: conversation.title,
        deletedAt: null,
      },
    });

    if (existing) {
      await prisma.$transaction(
        async (tx) => {
          await tx.aiMessage.deleteMany({
            where: { conversationId: existing.id },
          });
          await tx.aiConversation.update({
            where: { id: existing.id },
            data: {
              messages: {
                create: conversation.messages.map((message) => ({
                  role: message.role,
                  content: message.content,
                  mode: message.mode ?? "ASK",
                })),
              },
            },
          });
        },
        { timeout: 120_000, maxWait: 20_000 },
      );
      seedLog(`  ✓ Updated conversation ${conversation.title}`);
      continue;
    }

    await prisma.aiConversation.create({
      data: {
        userId: user.id,
        title: conversation.title,
        messages: {
          create: conversation.messages.map((message) => ({
            role: message.role,
            content: message.content,
            mode: message.mode ?? "ASK",
          })),
        },
      },
    });
    seedLog(`  ✓ Created conversation ${conversation.title}`);
  }

  for (const document of AI_DOCUMENT_SEED_DATA) {
    const user = await prisma.user.findUnique({
      where: { email: document.ownerEmail },
      select: { id: true },
    });

    if (!user) {
      seedLog(`  ⚠ User missing for document ${document.title}`);
      continue;
    }

    const existing = await prisma.aiDocument.findFirst({
      where: {
        userId: user.id,
        title: document.title,
        deletedAt: null,
      },
    });

    if (existing) {
      await prisma.aiDocument.update({
        where: { id: existing.id },
        data: {
          type: document.type,
          prompt: document.prompt,
          content: document.content,
          createdById: user.id,
        },
      });
      seedLog(`  ✓ Updated document ${document.title}`);
      continue;
    }

    await prisma.aiDocument.create({
      data: {
        userId: user.id,
        createdById: user.id,
        title: document.title,
        type: document.type,
        prompt: document.prompt,
        content: document.content,
      },
    });
    seedLog(`  ✓ Created document ${document.title}`);
  }
}
