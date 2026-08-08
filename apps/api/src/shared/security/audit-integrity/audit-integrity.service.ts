import type { AuditLog, Prisma } from "@enterprise/database";
import { prisma } from "@enterprise/database";

import type { WriteAuditLogInput } from "../write-audit-log.js";
import {
  AUDIT_CHAIN_BREAK_REASONS,
  AUDIT_CHAIN_GENESIS,
  AUDIT_HASH_VERSION,
  buildAuditEntity,
  canonicalizeAuditMetadata,
  computeAuditEventHash,
  type AuditChainBrokenRow,
  type AuditChainVerificationResult,
  type AuditExportIntegrityFields,
  type AuditVerificationStatus,
} from "./audit-integrity.types.js";

const BATCH_SIZE = 250;

/** Postgres advisory lock key for serializing audit chain appends. */
const AUDIT_CHAIN_LOCK_KEY = 860_806_020;

type IntegrityRow = Pick<
  AuditLog,
  | "id"
  | "userId"
  | "action"
  | "resource"
  | "resourceId"
  | "metadata"
  | "eventHash"
  | "previousHash"
  | "hashVersion"
  | "timestampIntegrity"
  | "createdAt"
  | "ipAddress"
  | "userAgent"
>;

function toIsoTimestamp(value: Date): string {
  return value.toISOString();
}

function metadataRecord(
  metadata: Prisma.JsonValue | null | undefined,
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

/**
 * Streams audit rows in chronological order without loading the full table.
 */
async function* streamAuditLogs(
  batchSize = BATCH_SIZE,
): AsyncGenerator<IntegrityRow> {
  let lastCreatedAt: Date | null = null;
  let lastId: string | null = null;

  for (;;) {
    const where =
      lastId && lastCreatedAt
        ? {
            OR: [
              { createdAt: { gt: lastCreatedAt } },
              {
                AND: [
                  { createdAt: lastCreatedAt },
                  { id: { gt: lastId } },
                ],
              },
            ],
          }
        : undefined;

    const rows: IntegrityRow[] = await prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: batchSize,
      select: {
        id: true,
        userId: true,
        action: true,
        resource: true,
        resourceId: true,
        metadata: true,
        eventHash: true,
        previousHash: true,
        hashVersion: true,
        timestampIntegrity: true,
        createdAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    if (rows.length === 0) {
      return;
    }

    for (const row of rows) {
      yield row;
    }

    const last: IntegrityRow = rows[rows.length - 1]!;
    lastCreatedAt = last.createdAt;
    lastId = last.id;
  }
}

function evaluateRow(
  row: IntegrityRow,
  expectedPreviousHash: string,
  rowNumber: number,
): {
  status: AuditVerificationStatus;
  nextExpected: string;
  broken: AuditChainBrokenRow | null;
} {
  const hasIntegrity =
    Boolean(row.eventHash) &&
    Boolean(row.previousHash) &&
    Boolean(row.timestampIntegrity);

  if (!hasIntegrity) {
    // Partially filled integrity fields = missing link in the hashed chain.
    if (row.eventHash || row.previousHash || row.timestampIntegrity) {
      return {
        status: "missing_link",
        nextExpected: expectedPreviousHash,
        broken: {
          id: row.id,
          reason: AUDIT_CHAIN_BREAK_REASONS.MISSING_LINK,
          rowNumber,
        },
      };
    }

    return {
      status: "legacy",
      nextExpected: expectedPreviousHash,
      broken: null,
    };
  }

  if (row.previousHash !== expectedPreviousHash) {
    return {
      status: "broken_hash",
      nextExpected: expectedPreviousHash,
      broken: {
        id: row.id,
        reason: AUDIT_CHAIN_BREAK_REASONS.BROKEN_HASH,
        rowNumber,
      },
    };
  }

  const timestamp = toIsoTimestamp(row.timestampIntegrity!);
  const computed = computeAuditEventHash({
    previousHash: row.previousHash!,
    timestamp,
    actor: row.userId ?? "",
    action: row.action,
    entity: buildAuditEntity(row.resource, row.resourceId),
    metadata: canonicalizeAuditMetadata(metadataRecord(row.metadata)),
  });

  if (computed !== row.eventHash) {
    return {
      status: "corrupted_event",
      nextExpected: expectedPreviousHash,
      broken: {
        id: row.id,
        reason: AUDIT_CHAIN_BREAK_REASONS.CORRUPTED_EVENT,
        rowNumber,
      },
    };
  }

  if (row.hashVersion !== AUDIT_HASH_VERSION) {
    return {
      status: "corrupted_event",
      nextExpected: expectedPreviousHash,
      broken: {
        id: row.id,
        reason: AUDIT_CHAIN_BREAK_REASONS.CORRUPTED_EVENT,
        rowNumber,
      },
    };
  }

  return {
    status: "valid",
    nextExpected: row.eventHash!,
    broken: null,
  };
}

async function emitChainCorruptedSecurityEvent(
  broken: AuditChainBrokenRow,
): Promise<void> {
  // Dynamic import avoids circular dependency:
  // write-audit-log → audit-integrity → monitoring → write-audit-log
  const { securityMonitoringService } = await import("../monitoring/index.js");
  await securityMonitoringService.reportAuditChainCorruption({
    resource: "audit",
    resourceId: broken.id,
    message: "Audit integrity chain verification failed.",
    metadata: {
      reason: broken.reason,
      rowNumber: broken.rowNumber,
      auditLogId: broken.id,
    },
  });
}

class AuditIntegrityService {
  /**
   * Appends an audit log with blockchain-style hash chaining.
   * Serializes appends via advisory lock so previousHash stays consistent.
   */
  async appendWithIntegrity(input: WriteAuditLogInput): Promise<AuditLog> {
    const timestampIntegrity = new Date();
    const actor = input.userId ?? "";
    const entity = buildAuditEntity(input.resource, input.resourceId);
    const metadataCanonical = canonicalizeAuditMetadata(input.metadata ?? null);

    // Hard caps so advisory-lock waiters cannot hold pool connections indefinitely.
    const maxWaitMs = Number(
      process.env.AUDIT_INTEGRITY_TX_MAX_WAIT_MS ?? 5_000,
    );
    const timeoutMs = Number(
      process.env.AUDIT_INTEGRITY_TX_TIMEOUT_MS ?? 10_000,
    );

    return prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_CHAIN_LOCK_KEY})`;

        const lastHashed = await tx.auditLog.findFirst({
          where: { eventHash: { not: null } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { eventHash: true },
        });

        const previousHash = lastHashed?.eventHash ?? AUDIT_CHAIN_GENESIS;
        const eventHash = computeAuditEventHash({
          previousHash,
          timestamp: toIsoTimestamp(timestampIntegrity),
          actor,
          action: input.action,
          entity,
          metadata: metadataCanonical,
        });

        return tx.auditLog.create({
          data: {
            userId: input.userId ?? null,
            action: input.action,
            resource: input.resource,
            resourceId: input.resourceId ?? null,
            metadata: (input.metadata ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
            eventHash,
            previousHash,
            hashVersion: AUDIT_HASH_VERSION,
            timestampIntegrity,
          },
        });
      },
      {
        maxWait: Number.isFinite(maxWaitMs) ? maxWaitMs : 5_000,
        timeout: Number.isFinite(timeoutMs) ? timeoutMs : 10_000,
      },
    );
  }

  /**
   * Verifies the full integrity chain by streaming batches.
   * On break: emits AUDIT_CHAIN_CORRUPTED (no client-facing hash details).
   */
  async verifyAuditChain(options?: {
    emitSecurityEventOnBreak?: boolean;
  }): Promise<AuditChainVerificationResult> {
    const started = Date.now();
    let verifiedRows = 0;
    let hashedRows = 0;
    let legacyRows = 0;
    let expectedPreviousHash = AUDIT_CHAIN_GENESIS;
    let brokenRow: AuditChainBrokenRow | null = null;

    for await (const row of streamAuditLogs()) {
      verifiedRows += 1;
      const result = evaluateRow(row, expectedPreviousHash, verifiedRows);

      if (result.status === "legacy") {
        legacyRows += 1;
        continue;
      }

      if (result.broken) {
        brokenRow = result.broken;
        break;
      }

      hashedRows += 1;
      expectedPreviousHash = result.nextExpected;
    }

    const chainValid = brokenRow === null;
    if (
      !chainValid &&
      brokenRow &&
      options?.emitSecurityEventOnBreak !== false
    ) {
      await emitChainCorruptedSecurityEvent(brokenRow);
    }

    return {
      chainValid,
      verifiedRows,
      hashedRows,
      legacyRows,
      brokenRow,
      verificationTimeMs: Date.now() - started,
      hashVersion: AUDIT_HASH_VERSION,
    };
  }

  /**
   * Per-row export integrity fields while streaming the chain check.
   */
  async *exportAuditIntegrityRows(): AsyncGenerator<
    IntegrityRow & AuditExportIntegrityFields
  > {
    let expectedPreviousHash = AUDIT_CHAIN_GENESIS;
    let rowNumber = 0;
    let chainBroken = false;
    let breakStatus: AuditVerificationStatus = "valid";

    for await (const row of streamAuditLogs()) {
      rowNumber += 1;

      if (chainBroken) {
        yield {
          ...row,
          hash: row.eventHash,
          previousHash: row.previousHash,
          chainVersion: row.hashVersion ?? AUDIT_HASH_VERSION,
          verificationStatus: breakStatus,
        };
        continue;
      }

      const result = evaluateRow(row, expectedPreviousHash, rowNumber);
      if (result.broken) {
        chainBroken = true;
        breakStatus = result.status;
        yield {
          ...row,
          hash: row.eventHash,
          previousHash: row.previousHash,
          chainVersion: row.hashVersion ?? AUDIT_HASH_VERSION,
          verificationStatus: result.status,
        };
        continue;
      }

      if (result.status === "legacy") {
        yield {
          ...row,
          hash: row.eventHash,
          previousHash: row.previousHash,
          chainVersion: row.hashVersion ?? AUDIT_HASH_VERSION,
          verificationStatus: "legacy",
        };
        continue;
      }

      expectedPreviousHash = result.nextExpected;
      yield {
        ...row,
        hash: row.eventHash,
        previousHash: row.previousHash,
        chainVersion: row.hashVersion ?? AUDIT_HASH_VERSION,
        verificationStatus: "valid",
      };
    }
  }
}

export const auditIntegrityService = new AuditIntegrityService();
