# Enterprise SaaS Audit — EliteFlow (Phase 8 Phase 1)

**Status:** Audit only. No scaling implementation.  
**Stance today:** Mature **single-tenant** (one deployment ≈ one customer org), with client portal scoping via `companyId` and reserved org/workspace fields.

---

## Summary

EliteFlow has strong RBAC, modular APIs, env feature flags, and a Postgres notification queue. Highest SaaS gaps: in-memory rate limits, no org FK isolation on core entities, admin unbounded report scans, and background work that is in-process or manually drained.

---

## 1. Authentication

| Path | Role |
|------|------|
| `apps/api/src/middleware/auth.middleware.ts` | JWT verify |
| `apps/api/src/modules/auth/auth.tokens.ts` | App HS256 JWT |
| `apps/api/src/modules/auth/auth.cookies.ts` | Refresh httpOnly cookie |
| `apps/api/src/integrations/supabase/supabase.auth.ts` | OAuth / identity |

**Observations**
1. API auth is app-issued JWT (`sub`, role, permissions, `sessionId`) — not Supabase JWT for API.
2. Refresh cookie is production-hardened (`SameSite=None; Secure` when cross-origin).
3. `SECURITY_PERMISSION_REFRESH` reloads permissions from DB per request — correct freshness, amplifies DB load at SaaS scale unless cached later.

---

## 2. Permissions / RBAC

| Path | Role |
|------|------|
| `packages/shared/src/constants/permissions.ts` | Canonical keys |
| `apps/api/src/middleware/permission.middleware.ts` | Enforce |
| `apps/api/src/shared/services/permission.service.ts` | Resolution |

**Observations**
1. Global roles (`roleId` per user) — no org-scoped membership roles.
2. Route + in-service permission checks are consistent but duplicated.
3. Multi-tenant SaaS needs org membership on `req.auth` (does not exist today).

---

## 3. API architecture

| Path | Role |
|------|------|
| `apps/api/src/app.ts` / `routes/index.ts` | Modular `/api/v1` |
| `apps/api/src/middleware/rate-limit.middleware.ts` | Rate limits |
| `apps/api/src/middleware/request-timing.middleware.ts` | Timing logs |

**Observations**
1. Domain routers are clear and reusable.
2. Rate limits use an **in-memory Map** — not shared across replicas.
3. Observability is console / Server-Timing — no fleet metrics contract yet.

---

## 4. Database access

| Path | Role |
|------|------|
| `packages/database/src/client.ts` | Prisma singleton |
| Domain `*.repository.ts` / `scope()` patterns | Role filters |

**Observations**
1. Pool sizing is via `DATABASE_URL` only.
2. Scoping is role/company filters — **not** `organization_id` on Project/Task/Invoice/Conversation.
3. `OrganizationSettings` is singleton-style (`key: "default"`) — one-org-per-deploy model.

---

## 5. React Query

| Path | Role |
|------|------|
| `apps/web/src/services/api/query-client.ts` | Defaults |
| `features/performance/utils/performance-query-defaults.ts` | Flag-tuned TTLs |

**Observations**
1. Sensible stale/gc defaults; performance flags extend TTLs.
2. localStorage persist (`eliteflow-rq-cache-v1`) — tenant-safe today; needs org dimension before multi-org switching.
3. Query keys lack tenant id (acceptable for single-tenant).

---

## 6. AI Assistant

| Path | Role |
|------|------|
| `apps/api/src/modules/ai/ai.controller.ts` | SSE stream |
| `apps/api/src/modules/ai/providers/*` | Provider registry |
| `foundation/memory/persistence/memory-background-jobs.ts` | In-process jobs |

**Observations**
1. Long-lived SSE connections need connection budgets at scale.
2. No per-tenant AI quota in the request path.
3. Memory jobs use in-process `setImmediate` — not horizontal-safe.

---

## 7. Reports

| Path | Role |
|------|------|
| `apps/api/src/modules/reports/reports.service.ts` | Analytics `scope()` |
| `features/reports/**` + `AI_BI_*` | Presentation |

**Observations**
1. Admins can scan entire tables — painful on a shared multi-tenant DB.
2. Dashboard aggregates many domains + optional AI — CPU/DB heavy.
3. Saved report schedules exist in schema without a dedicated worker.

---

## 8. Communication

| Path | Role |
|------|------|
| `apps/api/src/modules/communication/**` | Messaging |
| `packages/database/prisma/schema/communication.prisma` | Model |

**Observations**
1. Rich messaging model; isolation via membership, not org FK.
2. Message create fans out notifications — queue drain becomes critical under chat volume.
3. No org partition on conversations.

---

## 9. Automation / Action Framework

| Path | Role |
|------|------|
| `ai/foundation/action/**` | Planning / approval / execution |
| `ai/foundation/automation/**` | n8n adapter (stub-oriented) |

**Observations**
1. Approval-aware action framework is a strong SaaS control plane.
2. n8n is not a production runner yet.
3. Retries are in-process — need durable jobs for SaaS.

---

## 10. Background jobs / queues

| Path | Role |
|------|------|
| `notification.dispatcher.ts` / `processNotificationQueue` | Postgres queue |
| `integrations/scheduler/scheduler.service.ts` | Config only — no cron executor |
| Memory background jobs | Ephemeral process queue |

**Observations**
1. Notification queue is Postgres-backed (good primitive) but drained via admin HTTP, not workers.
2. Integration scheduler stores `nextRunAt` without an executor.
3. No Bull/SQS in API today — by design for this roadmap phase (planning only).

---

## 11. Upload pipeline

| Path | Role |
|------|------|
| `files.controller.ts` | Multer memoryStorage |
| `storage/storage.provider.ts` | Local / Supabase |

**Observations**
1. Full-file buffering in API memory — concurrent large uploads risk OOM.
2. Provider is deploy-config, not per-tenant.
3. Keys are not org-prefixed as a tenancy boundary.

---

## 12. Notifications

| Path | Role |
|------|------|
| `apps/api/src/modules/notifications/**` | Dispatcher, prefs, templates |
| Communication flags | WhatsApp/email orchestration |

**Observations**
1. In-app + EMAIL queue mature; PUSH/SMS stubs; WhatsApp deferred behind flags.
2. Process loop is synchronous per claim batch — needs workers at SaaS volume.
3. Audience includes role / department / client group — org-wide fan-out must be bounded later.

---

## 13. Feature flags

**Pattern:** `NEXT_PUBLIC_*` + API mirrors; defaults OFF; Phase docs + rollback.  
**Gap:** Flags are deployment-global, not per-org/plan.

---

## 14. Health / metrics / tenancy fields

| Path | Role |
|------|------|
| `GET /api/v1/health` | Liveness `{ status: "ok" }` |
| Integration health / monitoring services | Probe DTOs |
| Reserved `organizationId` / `workspaceId` | Whiteboards, AI context |

**Observations**
1. Health is liveness-only (no DB/storage readiness).
2. Metrics are ad-hoc logs/DTOs — not a fleet contract.
3. Codebase comments: single-tenant today; reserved columns for future org/workspace.

---

## Scalability readiness matrix

| Area | Single-tenant | Multi-instance / SaaS gap |
|------|---------------|---------------------------|
| Auth / RBAC | Strong | No org membership |
| Rate limits | OK one node | In-memory only |
| DB model | Mature domains | No org FK isolation |
| React Query | Tuned | No tenant in keys |
| AI / uploads | Feature-rich | SSE + memory buffers + in-process jobs |
| Queues | Postgres notify queue | Manual drain; no cron worker |
| Flags | Phased env pattern | Global only |
| Health | Basic OK | No readiness probes |

---

*Phase 2 may implement readiness helpers behind `SAAS_*`; Phase 1 stops at this audit.*
