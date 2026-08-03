/**
 * WhatsApp Business Cloud API config (env-only).
 */

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

export const whatsappConfig = {
  accessToken: trimEnv(process.env.WHATSAPP_ACCESS_TOKEN),
  phoneNumberId: trimEnv(process.env.WHATSAPP_PHONE_NUMBER_ID),
  verifyToken: trimEnv(process.env.WHATSAPP_VERIFY_TOKEN),
  apiVersion: trimEnv(process.env.WHATSAPP_API_VERSION) || "v21.0",
  graphBase:
    trimEnv(process.env.WHATSAPP_GRAPH_BASE) ||
    "https://graph.facebook.com",
} as const;

export function isWhatsappCloudConfigured(): boolean {
  return Boolean(
    whatsappConfig.accessToken && whatsappConfig.phoneNumberId,
  );
}
