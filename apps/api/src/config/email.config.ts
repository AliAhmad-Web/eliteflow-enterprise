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
      emailConfig.gmail.refreshToken.length > 20,
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
        // Resend onboarding/testing cannot deliver to arbitrary inboxes.
        // If Gmail SMTP (or another mailer) is configured, do not lock to Resend.
        if (
          isSmtpConfigured() ||
          isGmailApiConfigured() ||
          isGithubEmailRelayConfigured()
        ) {
          return null;
        }
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

  const chain = listConfiguredEmailTransports();
  return chain[0] ?? "none";
}

export type EmailTransportLabel =
  | "gmail_api"
  | "github_relay"
  | "smtp"
  | "resend";

/**
 * Transports that can actually send, HTTPS-first so Vercel/Railway SMTP blocks
 * do not hide a working Gmail API / GitHub relay.
 */
export function listConfiguredEmailTransports(): EmailTransportLabel[] {
  const transports: EmailTransportLabel[] = [];
  if (isGmailApiConfigured()) transports.push("gmail_api");
  if (isGithubEmailRelayConfigured()) transports.push("github_relay");
  if (isSmtpConfigured()) transports.push("smtp");
  if (isResendConfigured()) transports.push("resend");
  return transports;
}

/**
 * Preferred transport first, then remaining configured transports.
 * Lets forgot-password succeed when Resend is in testing/domain mode
 * but Gmail SMTP (or another HTTPS mailer) is available.
 */
export function getEmailTransportChain(): EmailTransportLabel[] {
  const available = listConfiguredEmailTransports();
  const preferred = getEmailTransportLabel();
  const nonResend = available.filter((item) => item !== "resend");
  if (nonResend.length > 0) {
    const head =
      preferred !== "none" &&
      preferred !== "resend" &&
      nonResend.includes(preferred)
        ? [preferred, ...nonResend.filter((item) => item !== preferred)]
        : nonResend;
    return available.includes("resend") ? [...head, "resend"] : head;
  }
  if (preferred === "resend" || available.includes("resend")) {
    return ["resend"];
  }
  return available;
}

export function fromAddressForTransport(
  transport: EmailTransportLabel,
): string {
  if (
    transport === "smtp" &&
    emailConfig.smtp.user.includes("@")
  ) {
    return `EliteFlow <${emailConfig.smtp.user}>`;
  }
  if (
    transport === "gmail_api" &&
    emailConfig.gmail.user.includes("@")
  ) {
    return `EliteFlow <${emailConfig.gmail.user}>`;
  }
  if (
    transport === "github_relay" &&
    emailConfig.smtp.user.includes("@")
  ) {
    return `EliteFlow <${emailConfig.smtp.user}>`;
  }
  return emailConfig.fromEmail;
}
