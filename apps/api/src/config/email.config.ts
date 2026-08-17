function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** Vercel, Railway, and similar hosts — never treat Ethereal/Mailtrap as live mail. */
export function isLiveHostingPlatform(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_ENVIRONMENT_ID,
  );
}

const TEST_SMTP_HOST_MARKERS = [
  "ethereal.email",
  "ethereal.local",
  "mailtrap.io",
  "mailhog",
  "127.0.0.1",
  "localhost",
] as const;

export function isTestOnlySmtpHost(host = trimEnv(process.env.SMTP_HOST)): boolean {
  const normalized = host.toLowerCase();
  if (!normalized) return false;
  return TEST_SMTP_HOST_MARKERS.some((marker) => normalized.includes(marker));
}

export function classifySmtpHost(
  host = trimEnv(process.env.SMTP_HOST),
): "ethereal" | "gmail" | "localhost" | "other" | "missing" {
  const normalized = host.toLowerCase();
  if (!normalized) return "missing";
  if (normalized.includes("ethereal")) return "ethereal";
  if (normalized.includes("gmail")) return "gmail";
  if (normalized === "localhost" || normalized === "127.0.0.1") return "localhost";
  return "other";
}

function isPublicHttpsOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".local");
  } catch {
    return false;
  }
}

function corsOriginList(): string[] {
  return trimEnv(process.env.CORS_ORIGIN)
    .split(",")
    .map((origin) => stripTrailingSlash(origin.trim()))
    .filter(Boolean);
}

/**
 * Reset / verify links must hit the public EliteFlow web origin on live hosts.
 * Localhost FRONTEND_URL is ignored when WEB_APP_URL or CORS_ORIGIN is https.
 */
function resolveFrontendUrl(): string {
  const configured = stripTrailingSlash(trimEnv(process.env.FRONTEND_URL));
  const candidates = [
    configured,
    stripTrailingSlash(trimEnv(process.env.WEB_APP_URL)),
    ...corsOriginList(),
  ].filter(Boolean);

  if (isLiveHostingPlatform()) {
    const publicHttps = candidates.find(isPublicHttpsOrigin);
    if (publicHttps) {
      if (configured && !isPublicHttpsOrigin(configured)) {
        console.warn(
          `[email] FRONTEND_URL is not a public HTTPS origin; using ${new URL(publicHttps).host} for auth email links`,
        );
      }
      return publicHttps;
    }
    console.error(
      "[email] No public HTTPS frontend URL configured on a live host; password reset links may point at the wrong origin",
    );
  }

  return configured || "http://localhost:3000";
}

function isResendIncompatibleFrom(from: string): boolean {
  const lower = from.toLowerCase();
  return (
    lower.includes("ethereal.email") ||
    lower.includes("@gmail.com") ||
    lower.includes("@googlemail.com") ||
    lower.includes("localhost")
  );
}

export function classifyEmailFromDomain(
  from = trimEnv(process.env.EMAIL_FROM),
): "resend.dev" | "gmail.com" | "ethereal" | "other" | "missing" {
  const lower = from.toLowerCase();
  if (!lower) return "missing";
  if (lower.includes("ethereal")) return "ethereal";
  if (lower.includes("resend.dev")) return "resend.dev";
  if (lower.includes("gmail.com") || lower.includes("googlemail.com")) {
    return "gmail.com";
  }
  return "other";
}

export function classifyFrontendHost(
  url = resolveFrontendUrl(),
): "eliteflow-web" | "localhost" | "other-https" | "other" | "missing" {
  if (!url) return "missing";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("eliteflow-web")) return "eliteflow-web";
    if (host === "localhost" || host === "127.0.0.1") return "localhost";
    if (parsed.protocol === "https:") return "other-https";
    return "other";
  } catch {
    return "other";
  }
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
  frontendUrl: resolveFrontendUrl(),
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

function hasSmtpCredentials(): boolean {
  return Boolean(
    emailConfig.smtp.host &&
      emailConfig.smtp.user &&
      emailConfig.smtp.pass &&
      Number.isFinite(emailConfig.smtp.port) &&
      emailConfig.smtp.port > 0,
  );
}

export function isSmtpConfigured(): boolean {
  if (!hasSmtpCredentials()) return false;
  if (isLiveHostingPlatform() && isTestOnlySmtpHost(emailConfig.smtp.host)) {
    return false;
  }
  return true;
}

export function warnIfTestSmtpOnLiveHost(): void {
  if (
    isLiveHostingPlatform() &&
    hasSmtpCredentials() &&
    isTestOnlySmtpHost(emailConfig.smtp.host)
  ) {
    console.warn(
      `[email] Ignoring test SMTP host (${classifySmtpHost()}) on a live host; ` +
        "Ethereal/Mailtrap report success without delivering to real inboxes. " +
        "Using Gmail API, GitHub relay, or Resend instead.",
    );
  }
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
  if (preferred !== "none" && available.includes(preferred)) {
    return [preferred, ...available.filter((item) => item !== preferred)];
  }
  return available;
}

export function fromAddressForTransport(
  transport: EmailTransportLabel,
): string {
  if (transport === "resend") {
    const from = emailConfig.fromEmail;
    if (!from || isResendIncompatibleFrom(from)) {
      return "EliteFlow <onboarding@resend.dev>";
    }
    return from;
  }
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
