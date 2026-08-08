import { sanitizeAuditMetadata } from "@enterprise/shared";

import { auditIntegrityService } from "./audit-integrity/index.js";
import { logger } from "./logger.js";

export interface WriteAuditLogInput {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function fanOutToSiem(input: WriteAuditLogInput): void {
  void import("./siem/index.js")
    .then(({ siemIntegrationService, isSiemEnabled }) => {
      if (!isSiemEnabled()) return;
      siemIntegrationService.ingestAudit({
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        metadata: input.metadata,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
    })
    .catch(() => {
      /* SIEM fan-out must never affect audit path */
    });
}

/**
 * Central audit writer — always redacts sensitive metadata before persist.
 * WHO / WHAT / WHEN / WHERE without raw secrets or PII values.
 * Phase 3 Step 8: persists tamper-evident hash chain fields.
 * Fire-and-forget SIEM subscription after successful append (no AuditService change).
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  const metadata = sanitizeAuditMetadata(input.metadata ?? undefined);

  await auditIntegrityService.appendWithIntegrity({
    ...input,
    metadata: metadata ?? null,
  });

  fanOutToSiem({ ...input, metadata: metadata ?? null });
}

/**
 * Best-effort audit write that never throws into the request pipeline.
 */
export async function writeAuditLogSafe(
  input: WriteAuditLogInput,
  logLabel = "audit",
): Promise<void> {
  try {
    await writeAuditLog(input);
  } catch (error) {
    logger.error(`[${logLabel}] Failed to write audit log:`, error);
  }
}
