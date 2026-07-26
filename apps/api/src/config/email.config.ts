function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

const smtpHost = trimEnv(process.env.SMTP_HOST);
const smtpPortRaw = trimEnv(process.env.SMTP_PORT) || "587";
const smtpUser = trimEnv(process.env.SMTP_USER);
const smtpPass = trimEnv(process.env.SMTP_PASS);
const smtpSecure =
  trimEnv(process.env.SMTP_SECURE).toLowerCase() === "true" ||
  smtpPortRaw === "465";

export const emailConfig = {
  resendApiKey: trimEnv(process.env.RESEND_API_KEY),
  fromEmail:
    trimEnv(process.env.EMAIL_FROM) ||
    (smtpUser ? `EliteFlow <${smtpUser}>` : "EliteFlow <onboarding@resend.dev>"),
  frontendUrl: trimEnv(process.env.FRONTEND_URL) || "http://localhost:3000",
  appName: trimEnv(process.env.APP_NAME) || "EliteFlow",
  smtp: {
    host: smtpHost,
    port: Number(smtpPortRaw) || 587,
    secure: smtpSecure,
    user: smtpUser,
    pass: smtpPass,
  },
} as const;

export function isSmtpConfigured(): boolean {
  return Boolean(
    emailConfig.smtp.host &&
      emailConfig.smtp.user &&
      emailConfig.smtp.pass &&
      Number.isFinite(emailConfig.smtp.port) &&
      emailConfig.smtp.port > 0,
  );
}

export function isResendConfigured(): boolean {
  return emailConfig.resendApiKey.length > 0;
}

/** Auth + transactional email can send when SMTP (preferred) or Resend is set. */
export function isEmailConfigured(): boolean {
  return isSmtpConfigured() || isResendConfigured();
}

export function getEmailTransportLabel(): "smtp" | "resend" | "none" {
  if (isSmtpConfigured()) {
    return "smtp";
  }
  if (isResendConfigured()) {
    return "resend";
  }
  return "none";
}
