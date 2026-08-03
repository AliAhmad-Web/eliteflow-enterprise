function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

const smtpHost = trimEnv(process.env.SMTP_HOST);
const smtpPortRaw = trimEnv(process.env.SMTP_PORT) || "587";
const smtpUser = trimEnv(process.env.SMTP_USER);
/** Gmail app passwords may be pasted with spaces; normalize for SMTP auth. */
const smtpPass = trimEnv(process.env.SMTP_PASS).replace(/\s+/g, "");
const smtpSecure =
  trimEnv(process.env.SMTP_SECURE).toLowerCase() === "true" ||
  smtpPortRaw === "465";

const gmailClientId =
  trimEnv(process.env.GMAIL_OAUTH_CLIENT_ID) ||
  trimEnv(process.env.GOOGLE_CLIENT_ID);
const gmailClientSecret =
  trimEnv(process.env.GMAIL_OAUTH_CLIENT_SECRET) ||
  trimEnv(process.env.GOOGLE_CLIENT_SECRET);
const gmailRefreshToken = trimEnv(process.env.GMAIL_OAUTH_REFRESH_TOKEN);
const gmailUser =
  trimEnv(process.env.GMAIL_USER) ||
  trimEnv(process.env.SMTP_USER) ||
  "me";

export const emailConfig = {
  resendApiKey: trimEnv(process.env.RESEND_API_KEY),
  fromEmail:
    trimEnv(process.env.EMAIL_FROM) ||
    (gmailUser && gmailUser !== "me"
      ? `EliteFlow <${gmailUser}>`
      : smtpUser
        ? `EliteFlow <${smtpUser}>`
        : "EliteFlow <onboarding@resend.dev>"),
  frontendUrl: trimEnv(process.env.FRONTEND_URL) || "http://localhost:3000",
  appName: trimEnv(process.env.APP_NAME) || "EliteFlow",
  smtp: {
    host: smtpHost,
    port: Number(smtpPortRaw) || 587,
    secure: smtpSecure,
    user: smtpUser,
    pass: smtpPass,
  },
  gmail: {
    clientId: gmailClientId,
    clientSecret: gmailClientSecret,
    refreshToken: gmailRefreshToken,
    user: gmailUser,
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

export function isGmailApiConfigured(): boolean {
  return Boolean(
    emailConfig.gmail.clientId &&
      emailConfig.gmail.clientSecret &&
      emailConfig.gmail.refreshToken,
  );
}

export function isGithubEmailRelayConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_EMAIL_RELAY_TOKEN?.trim() &&
      process.env.GITHUB_EMAIL_RELAY_REPO?.trim(),
  );
}

export function isResendConfigured(): boolean {
  return emailConfig.resendApiKey.length > 0;
}

/** Prefer HTTPS transports on hosts that block SMTP (Railway). */
export function isEmailConfigured(): boolean {
  return (
    isGmailApiConfigured() ||
    isGithubEmailRelayConfigured() ||
    isSmtpConfigured() ||
    isResendConfigured()
  );
}

export function getEmailTransportLabel():
  | "gmail_api"
  | "github_relay"
  | "smtp"
  | "resend"
  | "none" {
  const preferred = trimEnv(process.env.EMAIL_PROVIDER).toLowerCase();

  const tryPreferred = ():
    | "gmail_api"
    | "github_relay"
    | "smtp"
    | "resend"
    | null => {
    switch (preferred) {
      case "":
      case "auto":
        return null;
      case "smtp":
        return isSmtpConfigured() ? "smtp" : null;
      case "resend":
        return isResendConfigured() ? "resend" : null;
      case "gmail":
      case "gmail_api":
        return isGmailApiConfigured() ? "gmail_api" : null;
      case "github":
      case "github_relay":
        return isGithubEmailRelayConfigured() ? "github_relay" : null;
      default:
        return null;
    }
  };

  const forced = tryPreferred();
  if (forced) return forced;

  // Auto priority: HTTPS-friendly first on hosts that block SMTP.
  if (isGmailApiConfigured()) {
    return "gmail_api";
  }
  if (isGithubEmailRelayConfigured()) {
    return "github_relay";
  }
  if (isSmtpConfigured()) {
    return "smtp";
  }
  if (isResendConfigured()) {
    return "resend";
  }
  return "none";
}
