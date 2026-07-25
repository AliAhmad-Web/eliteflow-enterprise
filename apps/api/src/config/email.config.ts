export const emailConfig = {
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  fromEmail: process.env.EMAIL_FROM ?? "EliteFlow <onboarding@resend.dev>",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  appName: process.env.APP_NAME ?? "EliteFlow",
} as const;

export function isEmailConfigured(): boolean {
  return emailConfig.resendApiKey.length > 0;
}
