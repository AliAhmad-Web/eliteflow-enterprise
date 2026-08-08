/**
 * Enterprise Data Redaction Layer — single source for masking & log scrubbing.
 * Used by API response policies, audit writers, and application logging.
 */

export const REDACTED = "[REDACTED]";
export const MASKED_SALARY = "******";
export const FIELD_UPDATED = "[UPDATED]";

/** Keys whose values must never appear in logs, audits, or responses. */
export const SECRET_FIELD_KEY_RE =
  /^(.*)?(password|passwordhash|passwd|pwd|tokenhash|refreshtokenhash|refreshtoken|accesstoken|authorization|cookie|secret|encryptedsecret|temporarypassword|passwordsetupurl|setupurl|setuptoken|rawtoken|recoverycode|recoverycodes|mfasecret|totp|otpcode|apikey|privatekey|clientsecret)(.*)?$/i;

/** RESTRICTED business fields — redact or mask in logs/audits. */
export const RESTRICTED_FIELD_KEY_RE =
  /^(.*)?(salary|oldsalary|newsalary|nationalid|qrtoken|taxnumber|registrationnumber)(.*)?$/i;

/** CONFIDENTIAL PII — mask (partial reveal) in logs/audits/public responses. */
export const CONFIDENTIAL_FIELD_KEY_RE =
  /^(.*)?(email|personalemail|billingemail|phone|emergencycontactphone|address|addressline1|addressline2|dateofbirth|dob|emergencycontactname|emergencycontactrelation)(.*)?$/i;

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return null;
}

/** Salary → ****** */
export function maskSalary(_value?: unknown): string {
  return MASKED_SALARY;
}

/** National ID → ********5671 (keep last 4 when long enough). */
export function maskNationalId(value: unknown): string {
  const raw = asString(value)?.replace(/\s+/g, "") ?? "";
  if (!raw) return REDACTED;
  if (raw.length <= 4) return "*".repeat(Math.max(raw.length, 4));
  return `${"*".repeat(Math.max(8, raw.length - 4))}${raw.slice(-4)}`;
}

/** Phone → *******4567 (keep last 4). */
export function maskPhone(value: unknown): string {
  const raw = asString(value)?.replace(/\s+/g, "") ?? "";
  if (!raw) return REDACTED;
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 4) return "*".repeat(Math.max(raw.length, 4));
  const last4 = digits.slice(-4);
  const prefixLen = Math.max(raw.length - 4, 7);
  return `${"*".repeat(prefixLen)}${last4}`;
}

/** Email → a***@example.com */
export function maskEmail(value: unknown): string {
  const raw = asString(value)?.trim() ?? "";
  if (!raw || !raw.includes("@")) return REDACTED;
  const [local, domain] = raw.split("@");
  if (!local || !domain) return REDACTED;
  const visible = local.slice(0, 1) || "*";
  return `${visible}***@${domain}`;
}

/** Address / free-text PII → truncated mask. */
export function maskAddress(value: unknown): string {
  const raw = asString(value)?.trim() ?? "";
  if (!raw) return REDACTED;
  if (raw.length <= 4) return "****";
  return `${raw.slice(0, 2)}${"*".repeat(Math.min(12, raw.length - 2))}`;
}

/** DOB → ****-**-** or year-only when ISO-like. */
export function maskDateOfBirth(value: unknown): string {
  const raw = asString(value)?.trim() ?? "";
  if (!raw) return REDACTED;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-**-**`;
  return "****-**-**";
}

export function redactSecret(_value?: unknown): string {
  return REDACTED;
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export type RedactionMode = "log" | "audit" | "response";

function redactByKey(
  key: string,
  value: unknown,
  mode: RedactionMode,
): unknown {
  const normalized = normalizeKey(key);

  if (SECRET_FIELD_KEY_RE.test(normalized) || SECRET_FIELD_KEY_RE.test(key)) {
    return REDACTED;
  }

  if (
    RESTRICTED_FIELD_KEY_RE.test(normalized) ||
    RESTRICTED_FIELD_KEY_RE.test(key)
  ) {
    if (normalized.includes("nationalid")) {
      return mode === "audit" ? FIELD_UPDATED : maskNationalId(value);
    }
    if (normalized.includes("qrtoken")) {
      return REDACTED;
    }
    if (
      normalized.includes("salary") ||
      normalized.includes("taxnumber") ||
      normalized.includes("registrationnumber")
    ) {
      return mode === "audit" ? FIELD_UPDATED : maskSalary(value);
    }
    return mode === "audit" ? FIELD_UPDATED : REDACTED;
  }

  if (
    CONFIDENTIAL_FIELD_KEY_RE.test(normalized) ||
    CONFIDENTIAL_FIELD_KEY_RE.test(key)
  ) {
    if (normalized.includes("email")) return maskEmail(value);
    if (normalized.includes("phone")) return maskPhone(value);
    if (
      normalized.includes("address") ||
      normalized === "emergencycontactname" ||
      normalized === "emergencycontactrelation"
    ) {
      return maskAddress(value);
    }
    if (normalized.includes("dateofbirth") || normalized === "dob") {
      return maskDateOfBirth(value);
    }
    return REDACTED;
  }

  return value;
}

/**
 * Deep-sanitize any JSON-like structure for logs / audits / safe responses.
 * Does not mutate the input.
 */
export function sanitizeSensitiveData<T>(
  input: T,
  mode: RedactionMode = "log",
  seen: WeakSet<object> = new WeakSet(),
): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input !== "object") {
    return input;
  }

  if (input instanceof Error) {
    return {
      name: input.name,
      message: scrubSensitiveString(String(input.message)),
    } as T;
  }

  if (seen.has(input as object)) {
    return "[Circular]" as T;
  }
  seen.add(input as object);

  if (Array.isArray(input)) {
    return input.map((item) =>
      sanitizeSensitiveData(item, mode, seen),
    ) as T;
  }

  if (input instanceof Date) {
    return input.toISOString() as T;
  }

  const record = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    const normalized = normalizeKey(key);
    const isSensitive =
      SECRET_FIELD_KEY_RE.test(normalized) ||
      RESTRICTED_FIELD_KEY_RE.test(normalized) ||
      CONFIDENTIAL_FIELD_KEY_RE.test(normalized);

    if (isSensitive) {
      out[key] = redactByKey(key, value, mode);
    } else if (value !== null && typeof value === "object") {
      out[key] = sanitizeSensitiveData(value, mode, seen);
    } else if (typeof value === "string") {
      out[key] = mode === "log" ? scrubSensitiveString(value) : value;
    } else {
      out[key] = value;
    }
  }

  return out as T;
}

/** Application / error / request log scrubbing. */
export function sanitizeForLogging<T>(input: T): T {
  return sanitizeSensitiveData(input, "log");
}

/**
 * Audit metadata scrubbing — WHO/WHAT/WHEN/WHERE without raw secrets/PII values.
 * Salary/NID become [UPDATED]; emails/phones are masked.
 */
export function sanitizeAuditMetadata(
  metadata?: Record<string, unknown> | null,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  return sanitizeSensitiveData({ ...metadata }, "audit") as Record<
    string,
    unknown
  >;
}

/**
 * Mask CONFIDENTIAL fields on public/directory API payloads.
 * Does not strip keys (unlike field ACL) — values are display-safe.
 */
export function applyResponseMasking<T extends Record<string, unknown>>(
  dto: T,
  options?: { maskEmail?: boolean; maskPhone?: boolean },
): T {
  const next: Record<string, unknown> = { ...dto };
  const maskEmailFlag = options?.maskEmail !== false;
  const maskPhoneFlag = options?.maskPhone !== false;

  if (maskEmailFlag) {
    for (const key of Object.keys(next)) {
      const n = normalizeKey(key);
      if (n.includes("email") && next[key] != null) {
        next[key] = maskEmail(next[key]);
      }
    }
  }

  if (maskPhoneFlag) {
    for (const key of Object.keys(next)) {
      const n = normalizeKey(key);
      if (n.includes("phone") && next[key] != null) {
        next[key] = maskPhone(next[key]);
      }
    }
  }

  if (next.user && typeof next.user === "object" && next.user !== null) {
    const user = { ...(next.user as Record<string, unknown>) };
    if (maskEmailFlag && user.email != null) {
      user.email = maskEmail(user.email);
    }
    next.user = user;
  }

  if (next.manager && typeof next.manager === "object" && next.manager !== null) {
    const manager = { ...(next.manager as Record<string, unknown>) };
    if (maskEmailFlag && manager.email != null) {
      manager.email = maskEmail(manager.email);
    }
    next.manager = manager;
  }

  if (
    next.createdBy &&
    typeof next.createdBy === "object" &&
    next.createdBy !== null
  ) {
    const createdBy = { ...(next.createdBy as Record<string, unknown>) };
    if (maskEmailFlag && createdBy.email != null) {
      createdBy.email = maskEmail(createdBy.email);
    }
    next.createdBy = createdBy;
  }

  if (next.head && typeof next.head === "object" && next.head !== null) {
    const head = { ...(next.head as Record<string, unknown>) };
    if (maskEmailFlag && head.email != null) {
      head.email = maskEmail(head.email);
    }
    next.head = head;
  }

  return next as T;
}

/**
 * Format args for console logging with automatic scrubbing.
 */
export function formatLogArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === "string") {
      return scrubSensitiveString(arg);
    }
    if (arg instanceof Error) {
      return sanitizeForLogging({
        name: arg.name,
        message: arg.message,
      });
    }
    return sanitizeForLogging(arg);
  });
}

/** Best-effort scrub of secret-like substrings in free-form log lines. */
export function scrubSensitiveString(message: string): string {
  let out = message;
  out = out.replace(
    /(password|token|secret|authorization|cookie|salary|nationalId|qrToken|temporaryPassword|passwordSetupUrl|setupUrl|accessToken|refreshToken)\s*[:=]\s*["']?[^,"'\s}]+["']?/gi,
    "$1=[REDACTED]",
  );
  out = out.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    (match) => maskEmail(match),
  );
  out = out.replace(/\bsk-[a-zA-Z0-9]{10,}\b/g, REDACTED);
  out = out.replace(
    /\b(eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\b/g,
    REDACTED,
  );
  return out;
}
