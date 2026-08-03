# Scalability Architecture — Phase 8 Phase 1

**Status:** Architecture only. No production optimization. No Kubernetes / Redis / cloud migration.  
**Constraint:** Extend existing EliteFlow modules; no new product modules, routes, or schema redesign.

---

## Design principles

1. **Compose on existing seams** — NotificationQueue, Action Framework, React Query, rate-limit middleware, health route.
2. **Flag every enhancement** — `SAAS_*` default OFF; independent rollback.
3. **One-org-per-deploy first** — treat current singleton org as the default SaaS packaging unit; evolve isolation without breaking clients.
4. **Prefer durable Postgres queues over new brokers** in roadmap Phase 2 — Redis/K8s remain out of scope.
5. **Preserve contracts** — no REST/schema/auth/RBAC breaking changes in Phase 1–2 of this track.

---

## Target layering (planned)

```
Clients (Web / Mobile)
  └─ React Query (+ future SAAS_CACHE_STRATEGY policies)
        │
        ▼
API /api/v1 (existing modules)
  ├─ Auth + RBAC (unchanged contracts)
  ├─ Rate limit middleware → [Phase 2] shared/store-ready interface behind SAAS_SCALE_READINESS
  ├─ Domain services (role/company scope → [future] org scope when TENANT_READINESS matures)
  └─ AI SSE / uploads (connection & memory budgets — planned)
        │
        ▼
Postgres (existing)
  ├─ Domain tables (current role filters)
  ├─ NotificationQueue (claim/process) → [Phase 2] SAAS_QUEUE_SCALING / BACKGROUND_PROCESSING
  └─ Reserved organizationId / workspaceId fields (no schema redesign in Phase 1)
```

---

## Planned capabilities

| Concern | Flag | Plan (no infra replacement) |
|---------|------|------------------------------|
| Large user growth | `SCALE_READINESS` | Document connection budgets; prefer horizontal API replicas with sticky SSE awareness |
| High request volume | `SCALE_READINESS` | Rate-limit interface that can later swap in-memory Map for shared store **without** requiring Redis in this phase |
| Concurrent sessions | `SCALE_READINESS` | Session/JWT patterns unchanged; monitor refresh cookie fan-out |
| Queue scaling | `QUEUE_SCALING` | Tune claim batch sizes; allow scheduled drain hooks on existing `processNotificationQueue` |
| Background processing | `BACKGROUND_PROCESSING` | Move ephemeral `setImmediate` jobs toward DB-backed claim loops (same NotificationQueue pattern) |
| Cache strategy | `CACHE_STRATEGY` | Compose React Query TTLs / invalidate rules; optional tenant suffix on keys when multi-org arrives |
| Horizontal scaling | `SCALE_READINESS` | Stateless API assumption except in-memory rate limit & in-process jobs (flag-gated remediation plans) |
| Failover | `OPERATIONAL_READINESS` | Health readiness + deploy rollback via flags; DB failover remains infra concern |

---

## Explicit non-goals

- Kubernetes, Redis, CDN migration, sharding, multi-region
- Billing / subscription engines
- Tenant database split
- New operational dashboards (architecture only)

---

*Phase 2 may wire helpers behind flags; Phase 1 stops at this design.*
