import type {
  RetentionEntityType,
  RetentionLifecycleStatus,
} from "@enterprise/database";
import { prisma, Prisma } from "@enterprise/database";

import { writeAuditLogSafe } from "../write-audit-log.js";
import { logger } from "../logger.js";
import { securityMonitoringService } from "../monitoring/index.js";
import {
  archiveEntity,
  findRetentionCandidates,
  secureDeleteEntity,
} from "./retention.handlers.js";
import {
  getRetentionPolicy,
  RETENTION_POLICIES,
} from "./retention.policies.js";
import {
  RETENTION_LIFECYCLE_STATUSES,
  type RetentionModuleRunResult,
  type RetentionPolicyDto,
  type RetentionRunReport,
} from "./retention.types.js";

const RETENTION_AUDIT_RESOURCE = "data_retention";

function toEntityType(
  key: string,
): RetentionEntityType {
  return key as RetentionEntityType;
}

class DataRetentionService {
  /** Expose configured policies with active module-level legal hold flags. */
  async listPolicies(): Promise<RetentionPolicyDto[]> {
    const activeModuleHolds = await prisma.legalHold.findMany({
      where: { isActive: true, entityId: null },
      select: { entityType: true },
    });
    const heldTypes = new Set(activeModuleHolds.map((h) => h.entityType));

    return RETENTION_POLICIES.map((policy) => ({
      entityType: policy.entityType,
      label: policy.label,
      retentionPeriodDays: policy.retentionPeriodDays,
      archiveAfterDays: policy.archiveAfterDays,
      deleteAfterDays: policy.deleteAfterDays,
      autoCleanupEligible: policy.autoCleanupEligible,
      allowSecureDelete: policy.allowSecureDelete,
      legalHold: policy.legalHoldDefault || heldTypes.has(toEntityType(policy.entityType)),
      lifecycleStates: [...RETENTION_LIFECYCLE_STATUSES],
    }));
  }

  async getStatus() {
    const [lastRun, activeLegalHolds, lifecycleCounts] = await Promise.all([
      prisma.retentionJobRun.findFirst({
        orderBy: { startedAt: "desc" },
      }),
      prisma.legalHold.count({ where: { isActive: true } }),
      prisma.retentionLifecycle.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of lifecycleCounts) {
      byStatus[row.status] = row._count._all;
    }

    return {
      lastRun: lastRun
        ? {
            runId: lastRun.id,
            status: lastRun.status,
            startedAt: lastRun.startedAt.toISOString(),
            finishedAt: lastRun.finishedAt?.toISOString() ?? null,
            itemsArchived: lastRun.itemsArchived,
            itemsDeleted: lastRun.itemsDeleted,
            legalHolds: lastRun.legalHoldsSkipped,
            failures: lastRun.failures,
            executionTime: lastRun.executionTimeMs ?? 0,
            triggeredBy: lastRun.triggeredBy,
          }
        : null,
      activeLegalHolds,
      lifecycleByStatus: byStatus,
      policies: await this.listPolicies(),
    };
  }

  async isUnderLegalHold(
    entityType: RetentionEntityType,
    entityId: string,
  ): Promise<boolean> {
    const hold = await prisma.legalHold.findFirst({
      where: {
        isActive: true,
        entityType,
        OR: [{ entityId: null }, { entityId }],
      },
      select: { id: true },
    });
    return Boolean(hold);
  }

  async assertNotOnLegalHoldForDeletion(
    entityType: RetentionEntityType,
    entityId: string,
  ): Promise<void> {
    if (await this.isUnderLegalHold(entityType, entityId)) {
      throw new Error("Deletion prohibited while legal hold is active");
    }
  }

  async upsertLifecycle(
    entityType: RetentionEntityType,
    entityId: string,
    status: RetentionLifecycleStatus,
    patch: {
      archivedAt?: Date | null;
      pendingDeletionAt?: Date | null;
      secureDeletedAt?: Date | null;
      notes?: string | null;
    } = {},
  ) {
    return prisma.retentionLifecycle.upsert({
      where: {
        entityType_entityId: { entityType, entityId },
      },
      create: {
        entityType,
        entityId,
        status,
        archivedAt: patch.archivedAt ?? undefined,
        pendingDeletionAt: patch.pendingDeletionAt ?? undefined,
        secureDeletedAt: patch.secureDeletedAt ?? undefined,
        notes: patch.notes ?? undefined,
      },
      update: {
        status,
        ...(patch.archivedAt !== undefined
          ? { archivedAt: patch.archivedAt }
          : {}),
        ...(patch.pendingDeletionAt !== undefined
          ? { pendingDeletionAt: patch.pendingDeletionAt }
          : {}),
        ...(patch.secureDeletedAt !== undefined
          ? { secureDeletedAt: patch.secureDeletedAt }
          : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      },
    });
  }

  /**
   * Centralized retention evaluation + processor.
   * Archives eligible rows; secure-deletes when policy allows and no legal hold.
   */
  async runRetentionProcessor(options?: {
    triggeredBy?: string;
  }): Promise<RetentionRunReport> {
    const triggeredBy = options?.triggeredBy ?? "scheduler";
    const startedAt = Date.now();

    const run = await prisma.retentionJobRun.create({
      data: {
        status: "RUNNING",
        triggeredBy,
      },
    });

    const modules: RetentionModuleRunResult[] = [];
    let itemsArchived = 0;
    let itemsDeleted = 0;
    let legalHolds = 0;
    let failures = 0;

    try {
      const terminal = await prisma.retentionLifecycle.findMany({
        where: {
          status: { in: ["SECURE_DELETED", "PENDING_DELETION"] },
        },
        select: { entityType: true, entityId: true, status: true },
      });

      const excludeByType = new Map<RetentionEntityType, Set<string>>();
      for (const row of terminal) {
        if (row.status === "SECURE_DELETED") {
          const set =
            excludeByType.get(row.entityType) ?? new Set<string>();
          set.add(row.entityId);
          excludeByType.set(row.entityType, set);
        }
      }

      for (const policy of RETENTION_POLICIES) {
        const moduleResult: RetentionModuleRunResult = {
          entityType: policy.entityType,
          archived: 0,
          deleted: 0,
          skippedLegalHold: 0,
          errors: 0,
          errorMessages: [],
        };

        const entityType = toEntityType(policy.entityType);
        const exclude = excludeByType.get(entityType) ?? new Set<string>();

        // --- Archive phase ---
        if (policy.archiveAfterDays != null) {
          try {
            const candidates = await findRetentionCandidates(
              entityType,
              policy.archiveAfterDays,
              exclude,
            );

            for (const candidate of candidates) {
              try {
                const existing = await prisma.retentionLifecycle.findUnique({
                  where: {
                    entityType_entityId: {
                      entityType,
                      entityId: candidate.entityId,
                    },
                  },
                });

                if (
                  existing?.status === "ARCHIVED" ||
                  existing?.status === "SECURE_DELETED" ||
                  existing?.status === "PENDING_DELETION" ||
                  existing?.status === "LEGAL_HOLD"
                ) {
                  // LEGAL_HOLD may still need domain archive once — handled below if archivedAt missing
                  if (
                    existing.status === "LEGAL_HOLD" &&
                    existing.archivedAt
                  ) {
                    continue;
                  }
                  if (existing.status !== "LEGAL_HOLD") {
                    continue;
                  }
                }

                // Legal hold: archive still allowed
                const now = new Date();
                await archiveEntity(entityType, candidate.entityId, now);

                const onHold = await this.isUnderLegalHold(
                  entityType,
                  candidate.entityId,
                );

                await this.upsertLifecycle(
                  entityType,
                  candidate.entityId,
                  onHold ? "LEGAL_HOLD" : "ARCHIVED",
                  {
                    archivedAt: now,
                    notes: onHold
                      ? "Archived under active legal hold"
                      : "Archived by retention processor",
                  },
                );

                moduleResult.archived += 1;
                itemsArchived += 1;
              } catch (error) {
                moduleResult.errors += 1;
                failures += 1;
                moduleResult.errorMessages.push(
                  error instanceof Error ? error.message : "archive_failed",
                );
              }
            }
          } catch (error) {
            moduleResult.errors += 1;
            failures += 1;
            moduleResult.errorMessages.push(
              error instanceof Error
                ? error.message
                : "archive_candidates_failed",
            );
          }
        }

        // --- Secure delete phase ---
        if (
          policy.autoCleanupEligible &&
          policy.allowSecureDelete &&
          policy.deleteAfterDays != null
        ) {
          try {
            const candidates = await findRetentionCandidates(
              entityType,
              policy.deleteAfterDays,
              exclude,
            );

            for (const candidate of candidates) {
              try {
                if (
                  await this.isUnderLegalHold(entityType, candidate.entityId)
                ) {
                  moduleResult.skippedLegalHold += 1;
                  legalHolds += 1;
                  await this.upsertLifecycle(
                    entityType,
                    candidate.entityId,
                    "LEGAL_HOLD",
                    {
                      notes: "Secure delete skipped — legal hold",
                    },
                  );
                  continue;
                }

                const now = new Date();
                await this.upsertLifecycle(
                  entityType,
                  candidate.entityId,
                  "PENDING_DELETION",
                  { pendingDeletionAt: now },
                );

                await secureDeleteEntity(
                  entityType,
                  candidate.entityId,
                  now,
                );

                await this.upsertLifecycle(
                  entityType,
                  candidate.entityId,
                  "SECURE_DELETED",
                  {
                    secureDeletedAt: now,
                    notes: "Securely deleted by retention processor",
                  },
                );

                await writeAuditLogSafe(
                  {
                    action: "data_retention.secure_deleted",
                    resource: RETENTION_AUDIT_RESOURCE,
                    resourceId: candidate.entityId,
                    metadata: {
                      entityType: policy.entityType,
                      runId: run.id,
                    },
                  },
                  "data-retention",
                );

                moduleResult.deleted += 1;
                itemsDeleted += 1;
                exclude.add(candidate.entityId);
              } catch (error) {
                moduleResult.errors += 1;
                failures += 1;
                moduleResult.errorMessages.push(
                  error instanceof Error ? error.message : "delete_failed",
                );
              }
            }
          } catch (error) {
            moduleResult.errors += 1;
            failures += 1;
            moduleResult.errorMessages.push(
              error instanceof Error
                ? error.message
                : "delete_candidates_failed",
            );
          }
        } else if (
          !policy.allowSecureDelete &&
          policy.entityType === "AUDIT_LOGS"
        ) {
          // Explicit no-op for audit physical deletion.
        }

        modules.push(moduleResult);
      }

      const executionTime = Date.now() - startedAt;
      const report: RetentionRunReport = {
        runId: run.id,
        itemsArchived,
        itemsDeleted,
        legalHolds,
        failures,
        executionTime,
        modules,
        status: "COMPLETED",
      };

      await prisma.retentionJobRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          finishedAt: new Date(),
          executionTimeMs: executionTime,
          itemsArchived,
          itemsDeleted,
          legalHoldsSkipped: legalHolds,
          failures,
          details: modules as unknown as Prisma.InputJsonValue,
        },
      });

      await writeAuditLogSafe(
        {
          action: "data_retention.run_completed",
          resource: RETENTION_AUDIT_RESOURCE,
          resourceId: run.id,
          metadata: {
            itemsArchived,
            itemsDeleted,
            legalHolds,
            failures,
            executionTime,
            triggeredBy,
          },
        },
        "data-retention",
      );

      if (itemsDeleted >= 10) {
        void securityMonitoringService.reportMassDelete({
          resource: "data_retention",
          resourceId: run.id,
          message: "Mass secure deletion by retention processor",
          metadata: { itemsDeleted, itemsArchived, triggeredBy },
        });
      }

      return report;
    } catch (error) {
      const executionTime = Date.now() - startedAt;
      logger.error("[data-retention] Processor failed:", error);

      await prisma.retentionJobRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          executionTimeMs: executionTime,
          itemsArchived,
          itemsDeleted,
          legalHoldsSkipped: legalHolds,
          failures: failures + 1,
          details: {
            error: error instanceof Error ? error.message : "unknown",
            modules,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        runId: run.id,
        itemsArchived,
        itemsDeleted,
        legalHolds,
        failures: failures + 1,
        executionTime,
        modules,
        status: "FAILED",
      };
    }
  }
}

export const dataRetentionService = new DataRetentionService();
