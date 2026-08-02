/**
 * Provider-ready chat turn used by Memory Runtime.
 * Independent of Prisma / provider SDKs.
 */
export interface AiMemoryMessage {
  readonly role: "USER" | "ASSISTANT" | "SYSTEM";
  readonly content: string;
}
