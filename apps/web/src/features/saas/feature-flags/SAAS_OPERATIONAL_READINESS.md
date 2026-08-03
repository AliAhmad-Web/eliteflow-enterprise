# Operational Readiness Architecture — Phase 8 Phase 1

**Status:** Architecture only. No monitoring product implementation. No new dashboards.

---

## Goals

Prepare EliteFlow to expose **readiness**, **capacity**, and **usage** signals using existing health, timing, audit, and integration monitoring seams — all behind `SAAS_*` flags.

---

## Existing seams to reuse

| Seam | Path | Today |
|------|------|-------|
| Liveness | `GET /api/v1/health` | `{ status: "ok", timestamp }` |
| Request timing | `request-timing.middleware.ts` | Server-Timing / slow logs |
| Integration health | `integrations/health-checker.service.ts` | Provider probes |
| Integration monitoring | `integrations/monitoring/monitoring.service.ts` | Queue length DTOs |
| Authz / notification audit | existing audit writers | Action trails |
| Web Vitals | `web-vitals-reporter.tsx` + performance flags | Front-end RUM |

---

## Planned architecture

```
SAAS_HEALTH_MONITORING
  └─ Compose readiness checklist (DB ping, storage provider, email transport) — design only
       (extend existing /health conceptually; no contract change in Phase 1)

SAAS_OBSERVABILITY
  └─ Structured enrichment of timing / audit metadata (flag-gated)

SAAS_USAGE_METRICS
  └─ Aggregate counters from existing domains (AI chats, notifications queued, uploads)
       Presentation deferred; no new metrics DB

SAAS_CAPACITY_MANAGEMENT
  └─ Soft thresholds (queue depth, slow-request rate) → warnings only

SAAS_OPERATIONAL_READINESS
  └─ Ops checklist composition for deploy/rollback (docs + future helpers)
```

---

## Health checks (planned)

| Probe | Source | Phase 2 idea |
|-------|--------|--------------|
| Liveness | Existing `/health` | Keep unchanged for load balancers |
| Readiness | Prisma `$queryRaw` / storage head | Behind `HEALTH_MONITORING` — optional extended path **without** breaking current `/health` contract |
| Dependency | Integration health checker | Reuse |
| Queue | Notification queue pending count | Reuse monitoring DTO |

**Rule:** Do not break existing `GET /api/v1/health` response shape in Phase 1–2 without a flag-gated additive field or separate readiness route (future — out of Phase 1).

---

## Operational dashboards (architecture only)

No new EliteFlow dashboard. Planned views (external or future UI):

1. **Service health** — liveness/readiness timeline  
2. **Queue depth** — NotificationQueue pending/failed  
3. **Request SLOs** — p95 from timing logs  
4. **Usage** — AI / notifications / uploads volume  

Phase 2 may surface lightweight status chips on **existing** Settings / Security surfaces only if needed — still no new routes.

---

## Capacity planning (planned signals)

| Signal | Input |
|--------|-------|
| API pressure | Slow-request rate, rate-limit hits |
| DB pressure | Query duration logs (existing) |
| Queue backlog | Pending NotificationQueue rows |
| AI concurrency | Active SSE streams (planned counter) |
| Upload memory | Concurrent multer buffers (planned warning) |

---

## Explicit non-goals

- Prometheus/OTel mandatory stack in Phase 1  
- New ops dashboard module  
- Multi-region failover implementation  

---

*Phase 2 may implement helpers behind flags; Phase 1 stops at this design.*
