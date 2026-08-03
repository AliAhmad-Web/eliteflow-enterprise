# SaaS Rollback Strategy — Phase 8

**Goal:** Every SaaS enhancement disables via env without a code rollback.

---

## Principles

1. **Default OFF** — production matches pre–Phase-8 when `SAAS_*` unset.  
2. **Independent flags** — disable queue scaling without disabling health monitoring.  
3. **Fail open to baseline** — helpers no-op when OFF.  
4. **No infra rollback** — no Redis/K8s introduced.

---

## Per-flag rollback

| Flag | Enable effect (Phase 2) | Rollback |
|------|-------------------------|----------|
| `ENTERPRISE_FOUNDATION` | Marker | Unset |
| `TENANT_READINESS` | Tenant keys / persist suffix | Unset → global persist key |
| `SCALE_READINESS` | Concurrent helpers | Unset → sequential factories |
| `CACHE_STRATEGY` | RQ overlay | Unset → prior defaults |
| `BACKGROUND_PROCESSING` | Retry audits | Unset |
| `QUEUE_SCALING` | Larger batches | Unset → prior limits |
| `OBSERVABILITY` | Extra request logs | Unset |
| `HEALTH_MONITORING` | Readiness logs | Unset |
| `USAGE_METRICS` | In-memory counters | Unset |
| `CAPACITY_MANAGEMENT` | Soft assessment | Unset |
| `OPERATIONAL_READINESS` | Startup diagnostics | Unset |

Restart `apps/web` and `apps/api` after env changes.

---

## Emergency order

1. Disable ops (`USAGE_METRICS`, `CAPACITY_MANAGEMENT`, `OBSERVABILITY`, `HEALTH_MONITORING`, `OPERATIONAL_READINESS`)  
2. Disable processing (`QUEUE_SCALING`, `BACKGROUND_PROCESSING`, `CACHE_STRATEGY`)  
3. Disable `SCALE_READINESS` / `TENANT_READINESS`  
4. Confirm auth, RBAC, AI, Reports, Notifications still work

---

## Phase 2 verification

All `SAAS_*` unset → helpers no-op; `/health` unchanged; queue batch defaults restored; RQ defaults without SaaS overlay.
