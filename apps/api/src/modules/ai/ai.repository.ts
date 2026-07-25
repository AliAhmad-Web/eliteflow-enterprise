import {
  type AiAssistMode,
  type AiDocumentType,
  type AiMessageRole,
  prisma,
} from "@enterprise/database";
import type {
  ListAiConversationsQueryInput,
  ListAiDocumentsQueryInput,
} from "@enterprise/shared";

import type { ConversationWithMessages } from "./ai.types.js";

export class AiRepository {
  async listConversations(
    userId: string,
    query: ListAiConversationsQueryInput,
  ): Promise<{ items: ConversationWithMessages[]; total: number }> {
    const where = {
      userId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" as const } },
              {
                messages: {
                  some: {
                    content: {
                      contains: query.search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.aiConversation.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: query.limit,
      }),
      prisma.aiConversation.count({ where }),
    ]);

    return { items: items as ConversationWithMessages[], total };
  }

  async getConversation(
    id: string,
    userId: string,
  ): Promise<ConversationWithMessages | null> {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        _count: { select: { messages: true } },
      },
    });

    return conversation as ConversationWithMessages | null;
  }

  async createConversation(userId: string, title: string) {
    return prisma.aiConversation.create({
      data: { userId, title },
    });
  }

  async softDeleteConversation(id: string, userId: string): Promise<boolean> {
    const existing = await prisma.aiConversation.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return false;

    await prisma.aiConversation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }

  async addMessage(input: {
    conversationId: string;
    role: AiMessageRole;
    content: string;
    mode: AiAssistMode;
  }) {
    const [message] = await prisma.$transaction([
      prisma.aiMessage.create({
        data: {
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          mode: input.mode,
        },
      }),
      prisma.aiConversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return message;
  }

  async listMessages(conversationId: string) {
    return prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateConversationTitle(id: string, title: string) {
    return prisma.aiConversation.update({
      where: { id },
      data: { title },
    });
  }

  async listDocuments(
    userId: string,
    query: ListAiDocumentsQueryInput,
  ): Promise<{ items: Awaited<ReturnType<typeof prisma.aiDocument.findMany>>; total: number }> {
    const where = {
      userId,
      deletedAt: null,
      ...(query.type ? { type: query.type as AiDocumentType } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" as const } },
              { prompt: { contains: query.search, mode: "insensitive" as const } },
              {
                content: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.aiDocument.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: query.limit,
      }),
      prisma.aiDocument.count({ where }),
    ]);

    return { items, total };
  }

  async getDocument(id: string, userId: string) {
    return prisma.aiDocument.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  async createDocument(input: {
    userId: string;
    title: string;
    type: AiDocumentType;
    prompt: string;
    content: string;
  }) {
    return prisma.aiDocument.create({
      data: {
        userId: input.userId,
        createdById: input.userId,
        title: input.title,
        type: input.type,
        prompt: input.prompt,
        content: input.content,
      },
    });
  }

  async updateDocument(
    id: string,
    data: {
      title?: string;
      type?: AiDocumentType;
      prompt?: string;
      content?: string;
    },
  ) {
    return prisma.aiDocument.update({
      where: { id },
      data,
    });
  }

  async softDeleteDocument(id: string, userId: string): Promise<boolean> {
    const existing = await prisma.aiDocument.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return false;

    await prisma.aiDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}

export const aiRepository = new AiRepository();
