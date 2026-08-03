# Phase 8 – Phase 2 Regression Matrix

| Matrix | Expectation |
|--------|-------------|
| All `SAAS_*` OFF | Baseline EliteFlow (pre–Phase-8 behavior) |
| `TENANT_READINESS` ON | Persist key / tenant helpers active; APIs unchanged |
| `SCALE_READINESS` ON | Scale helpers concurrent; no UI change required |
| `CACHE_STRATEGY` ON | RQ defaults overlay applied |
| `QUEUE_SCALING` ON | Larger notification claim batches |
| `BACKGROUND_PROCESSING` ON | Retry plan audits on queue failures |
| `OBSERVABILITY` ON | Extra `[saas] request` logs |
| `HEALTH_MONITORING` ON | Readiness logs on `/health`; JSON same |
| `USAGE_METRICS` ON | In-process counters increment |
| `CAPACITY_MANAGEMENT` ON | Soft assessment available |
| `OPERATIONAL_READINESS` ON | Startup diagnostics logged |
| All ON | Combined; no contract breaks |

Rollback: unset all `NEXT_PUBLIC_SAAS_*` / `SAAS_*` → restart web + API.
