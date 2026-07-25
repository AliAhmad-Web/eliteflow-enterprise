import { ROUTES } from "@/constants/routes";

export const MESSAGE_DEEP_LINK_PARAMS = {
  CONVERSATION: "c",
  MESSAGE: "m",
} as const;

/** Deep link into Messages that opens a conversation and optional message. */
export function buildMessagesDeepLink(input: {
  conversationId: string;
  messageId?: string | null;
}): string {
  const params = new URLSearchParams({
    [MESSAGE_DEEP_LINK_PARAMS.CONVERSATION]: input.conversationId,
  });
  if (input.messageId) {
    params.set(MESSAGE_DEEP_LINK_PARAMS.MESSAGE, input.messageId);
  }
  return `${ROUTES.MESSAGES}?${params.toString()}`;
}

export function parseMessagesDeepLink(
  searchParams: URLSearchParams,
): { conversationId: string | null; messageId: string | null } {
  return {
    conversationId:
      searchParams.get(MESSAGE_DEEP_LINK_PARAMS.CONVERSATION) ||
      searchParams.get("conversation") ||
      searchParams.get("open"),
    messageId:
      searchParams.get(MESSAGE_DEEP_LINK_PARAMS.MESSAGE) ||
      searchParams.get("message"),
  };
}
