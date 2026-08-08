/**
 * Enterprise CsrfService — owns token lifecycle, storage, cookies, validation.
 * No Prisma / schema changes: Redis when available, process memory otherwise.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { Request, Response } from "express";

import { AUTH_HEADERS } from "@enterprise/shared";

import {
  isApiSecurityMonitoringEnabled,
  isApiSecuritySecureCookiesEnabled,
} from "../../../config/security-flags.js";
import { logger } from "../logger.js";
import { getRateLimitRedisClient } from "../rate-limit/redis-client.js";
import { securityMonitoringService } from "../monitoring/index.js";
import { writeAuditLogSafe } from "../write-audit-log.js";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_STORE_PREFIX,
  CSRF_TOKEN_BYTES,
} from "./csrf.constants.js";
import {
  getCsrfExpirationMs,
  isCsrfEnabled,
  isCsrfProduction,
  isCsrfSingleUse,
} from "./csrf.config.js";
import type {
  CsrfBinding,
  CsrfFailureReason,
  CsrfIssueInput,
  CsrfIssueResult,
  CsrfRecord,
  CsrfValidateInput,
  CsrfValidateResult,
} from "./csrf.types.js";

const memoryStore = new Map<string, CsrfRecord>();

const AUDIT_DEBOUNCE_MS = 10 * 60 * 1000;
const auditHits = new Map<string, { count: number; windowStart: number }>();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function storeKey(tokenHash: string): string {
  return `${CSRF_STORE_PREFIX}:${tokenHash}`;
}

function emptyBinding(partial?: Partial<CsrfBinding>): CsrfBinding {
  return {
    sessionId: partial?.sessionId ?? null,
    userId: partial?.userId ?? null,
    tenantId: partial?.tenantId ?? null,
  };
}

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function cookieOptions(maxAgeMs: number) {
  const prod = isCsrfProduction();
  const harden = isApiSecuritySecureCookiesEnabled();
  // Spec: SameSite=Lax. Cross-site APIs that need None can enable secure-cookie hardening.
  const sameSite: "lax" | "none" | "strict" =
    prod && harden ? "none" : "lax";

  return {
    httpOnly: false,
    secure: prod || sameSite === "none",
    sameSite,
    path: "/" as const,
    maxAge: maxAgeMs,
  };
}

async function redisGet(tokenHash: string): Promise<CsrfRecord | null> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return null;
    const raw = await redis.get(storeKey(tokenHash));
    if (!raw) return null;
    return JSON.parse(raw) as CsrfRecord;
  } catch (err) {
    logger.warn(
      `[csrf] redis get failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

async function redisSet(record: CsrfRecord, ttlMs: number): Promise<boolean> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return false;
    await redis.set(
      storeKey(record.tokenHash),
      JSON.stringify(record),
      "PX",
      Math.max(1, ttlMs),
    );
    return true;
  } catch (err) {
    logger.warn(
      `[csrf] redis set failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

async function redisDel(tokenHash: string): Promise<void> {
  try {
    const redis = await getRateLimitRedisClient();
    if (!redis || redis.status !== "ready") return;
    await redis.del(storeKey(tokenHash));
  } catch {
    // best-effort
  }
}

function memoryCleanup(now: number): void {
  if (memoryStore.size < 10_000) {
    for (const [key, record] of memoryStore) {
      if (record.expiresAt <= now) memoryStore.delete(key);
    }
    return;
  }
  for (const [key, record] of memoryStore) {
    if (record.expiresAt <= now) memoryStore.delete(key);
  }
  while (memoryStore.size > 10_000) {
    const first = memoryStore.keys().next().value;
    if (first === undefined) break;
    memoryStore.delete(first);
  }
}

async function loadRecord(tokenHash: string): Promise<CsrfRecord | null> {
  const fromRedis = await redisGet(tokenHash);
  if (fromRedis) return fromRedis;
  return memoryStore.get(tokenHash) ?? null;
}

async function saveRecord(record: CsrfRecord, ttlMs: number): Promise<void> {
  memoryStore.set(record.tokenHash, record);
  await redisSet(record, ttlMs);
}

async function deleteRecord(tokenHash: string): Promise<void> {
  memoryStore.delete(tokenHash);
  await redisDel(tokenHash);
}

function shouldAudit(reason: CsrfFailureReason, ip: string | null): boolean {
  const key = `${reason}:${ip ?? "unknown"}`;
  const now = Date.now();
  const existing = auditHits.get(key);
  if (!existing || now - existing.windowStart > AUDIT_DEBOUNCE_MS) {
    auditHits.set(key, { count: 1, windowStart: now });
    return false;
  }
  existing.count += 1;
  // Audit only after repeated failures (5+) in the window.
  return existing.count === 5 || (existing.count > 5 && existing.count % 10 === 0);
}

class CsrfService {
  cookieName(): string {
    return CSRF_COOKIE_NAME;
  }

  headerName(): string {
    return CSRF_HEADER_NAME;
  }

  readCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    const primary = cookies?.[CSRF_COOKIE_NAME];
    if (primary) return primary;
    // BC: accept legacy cookie names during migration.
    return (
      cookies?.["__Host-csrf-token"] ??
      cookies?.["csrf-token"] ??
      undefined
    );
  }

  readHeader(req: Request): string | undefined {
    const value = req.get(CSRF_HEADER_NAME) ?? req.get(AUTH_HEADERS.CSRF_TOKEN);
    return value?.trim() || undefined;
  }

  /**
   * Issue a new CSRF token, persist server-side, set readable cookie + response header.
   */
  async issue(res: Response, input: CsrfIssueInput = {}): Promise<CsrfIssueResult> {
    if (input.previousToken) {
      await deleteRecord(hashToken(input.previousToken));
    }

    const token = randomBytes(CSRF_TOKEN_BYTES).toString("base64url");
    const tokenHash = hashToken(token);
    const binding = emptyBinding(input.binding);
    const ttlMs = getCsrfExpirationMs();
    const expiresAt = Date.now() + ttlMs;

    const record: CsrfRecord = {
      tokenHash,
      expiresAt,
      consumedAt: null,
      ...binding,
    };

    memoryCleanup(Date.now());
    await saveRecord(record, ttlMs);

    res.cookie(CSRF_COOKIE_NAME, token, cookieOptions(ttlMs));
    res.setHeader(CSRF_HEADER_NAME, token);

    return { token, expiresAt, binding };
  }

  /** Clear CSRF cookie and server record. */
  async clear(req: Request, res: Response): Promise<void> {
    const existing = this.readCookie(req);
    if (existing) {
      await deleteRecord(hashToken(existing));
    }
    res.clearCookie(CSRF_COOKIE_NAME, {
      path: "/",
      secure: isCsrfProduction(),
      sameSite: "lax",
    });
    // Clear legacy names too.
    res.clearCookie("__Host-csrf-token", { path: "/" });
    res.clearCookie("csrf-token", { path: "/" });
  }

  /**
   * Rotate: invalidate previous, issue new with binding.
   */
  async rotate(
    req: Request,
    res: Response,
    binding?: Partial<CsrfBinding>,
  ): Promise<CsrfIssueResult> {
    const previous = this.readCookie(req);
    return this.issue(res, { binding, previousToken: previous });
  }

  async validate(input: CsrfValidateInput): Promise<CsrfValidateResult> {
    const { cookieToken, headerToken, binding } = input;

    if (!cookieToken && !headerToken) {
      return { ok: false, reason: "CSRF_MISSING" };
    }
    if (!cookieToken || !headerToken) {
      return { ok: false, reason: "CSRF_MISSING" };
    }
    if (!safeEqualString(cookieToken, headerToken)) {
      return { ok: false, reason: "CSRF_INVALID" };
    }

    const tokenHash = hashToken(cookieToken);
    const record = await loadRecord(tokenHash);
    if (!record) {
      // Cookie/header match but unknown to server — treat as invalid/expired.
      return { ok: false, reason: "CSRF_INVALID" };
    }

    if (record.expiresAt <= Date.now()) {
      await deleteRecord(tokenHash);
      return { ok: false, reason: "CSRF_EXPIRED" };
    }

    if (isCsrfSingleUse() && record.consumedAt != null) {
      return { ok: false, reason: "CSRF_REPLAY" };
    }

    // Session binding: reject when bound identity diverges from request auth.
    if (record.sessionId || record.userId || record.tenantId) {
      if (binding) {
        if (
          record.sessionId &&
          binding.sessionId &&
          record.sessionId !== binding.sessionId
        ) {
          return { ok: false, reason: "CSRF_SESSION_MISMATCH" };
        }
        if (
          record.userId &&
          binding.userId &&
          record.userId !== binding.userId
        ) {
          return { ok: false, reason: "CSRF_SESSION_MISMATCH" };
        }
        if (
          record.tenantId &&
          binding.tenantId &&
          record.tenantId !== binding.tenantId
        ) {
          return { ok: false, reason: "CSRF_SESSION_MISMATCH" };
        }
      }
    }

    if (isCsrfSingleUse()) {
      record.consumedAt = Date.now();
      const ttlMs = Math.max(1, record.expiresAt - Date.now());
      await saveRecord(record, ttlMs);
    }

    return { ok: true, record };
  }

  reportFailure(input: {
    reason: CsrfFailureReason;
    req: Request;
  }): void {
    const ip =
      typeof input.req.headers["x-forwarded-for"] === "string"
        ? input.req.headers["x-forwarded-for"].split(",")[0]?.trim()
        : input.req.ip;
    const userAgent =
      typeof input.req.headers["user-agent"] === "string"
        ? input.req.headers["user-agent"]
        : null;

    const metadata = {
      reason: input.reason,
      method: input.req.method,
      path: input.req.originalUrl,
      // Never log token values.
    };

    switch (input.reason) {
      case "CSRF_MISSING":
        void securityMonitoringService.reportCsrfMissing({
          userId: input.req.auth?.userId ?? null,
          resource: "csrf",
          resourceId: input.req.path,
          message: "CSRF token missing",
          metadata,
          ipAddress: ip ?? null,
          userAgent,
        });
        break;
      case "CSRF_INVALID":
        void securityMonitoringService.reportCsrfInvalid({
          userId: input.req.auth?.userId ?? null,
          resource: "csrf",
          resourceId: input.req.path,
          message: "CSRF token invalid",
          metadata,
          ipAddress: ip ?? null,
          userAgent,
        });
        break;
      case "CSRF_EXPIRED":
        void securityMonitoringService.reportCsrfExpired({
          userId: input.req.auth?.userId ?? null,
          resource: "csrf",
          resourceId: input.req.path,
          message: "CSRF token expired",
          metadata,
          ipAddress: ip ?? null,
          userAgent,
        });
        break;
      case "CSRF_REPLAY":
        void securityMonitoringService.reportCsrfReplay({
          userId: input.req.auth?.userId ?? null,
          resource: "csrf",
          resourceId: input.req.path,
          message: "CSRF token replay",
          metadata,
          ipAddress: ip ?? null,
          userAgent,
        });
        break;
      case "CSRF_SESSION_MISMATCH":
        void securityMonitoringService.reportCsrfSessionMismatch({
          userId: input.req.auth?.userId ?? null,
          resource: "csrf",
          resourceId: input.req.path,
          message: "CSRF session mismatch",
          metadata,
          ipAddress: ip ?? null,
          userAgent,
        });
        break;
      default: {
        const _exhaustive: never = input.reason;
        void _exhaustive;
        break;
      }
    }

    if (
      isApiSecurityMonitoringEnabled() &&
      shouldAudit(input.reason, ip ?? null)
    ) {
      void writeAuditLogSafe(
        {
          userId: input.req.auth?.userId ?? null,
          action: "security.csrf_rejected",
          resource: "csrf",
          resourceId: input.req.originalUrl,
          metadata,
          ipAddress: ip ?? null,
          userAgent,
        },
        "csrf",
      );
    }
  }

  isEnabled(): boolean {
    return isCsrfEnabled();
  }
}

export const csrfService = new CsrfService();
