# EliteFlow — Supabase-Native Production API Migration Audit

**Status:** PHASE 1 AUDIT + PHASE 2 DESIGN ONLY  
**Date:** 2026-08-11  
**Scope:** Production API compute migration toward Supabase-native infrastructure  
**Explicitly out of scope for this document’s execution:** Implementation (migration Phase 3+), Railway (forbidden), Phase 3 product features, RBAC weakening, second database  

**Railway confirmation:** Railway MUST NOT be used at any point (CLI, deploy, credentials, env, `*.up.railway.app`). Historical `railway.json` / docs may remain untouched until separately approved for cleanup.

---

## Executive verdict

| Question | Answer |
|----------|--------|
| Can Supabase PostgreSQL alone host the Express API? | **No.** It is the data plane only. |
| Can the current Express monolith be lift-and-shifted into Supabase Edge Functions safely? | **No.** Not without redesign (Prisma engine, argon2, multer disk, ioredis, in-process timers, Express middleware stack, ~400+ routes, long SSE). |
| Is there an approved production API compute host today? | **No** (Railway forbidden; no other host named). |
| Recommended Supabase-native **target** architecture? | **Hybrid:** Supabase Postgres + Storage + Auth/JWKS (unchanged as SoT) + **domain Edge Functions** (HTTP) + **pg_cron / DB queues** (jobs) + **streaming AI as a dedicated Edge function or approved redesign** + **Redis-compatible rate limit retained or pg-backed equivalent** — with **incremental cutover**, shared domain services extracted (not rewritten). |
| Implementation started? | **No.** Waiting for human approval of the design waves. |

---

## 1. Current architecture (inspected)

```
Browser (Vercel Next.js)
    │  NEXT_PUBLIC_API_URL + credentials/cookies
    ▼
Node Express (apps/api)  ← long-lived process (app.listen)
    ├── EliteFlow JWT + DB session + CSRF + RBAC middleware
    ├── Prisma → Supabase PostgreSQL (DATABASE_URL / DIRECT_URL)
    ├── Supabase Storage (STORAGE_PROVIDER=supabase preferred)
    ├── Supabase Auth/JWKS (OAuth / token verify helpers)
    ├── Redis (ioredis) → rate limit + CSRF store + caches
    ├── setInterval jobs (8+) + SIEM flush timer
    └── SSE: POST /api/v1/ai/chat/stream
```

| Layer | Location | Notes |
|-------|----------|-------|
| Entry | `apps/api/src/server.ts` | Boot asserts → `createApp()` → `listen` → start jobs |
| App | `apps/api/src/app.ts` | CORS, Stripe raw body, JSON 1mb, cookies, CSRF, `/api/v1` + `/api/v2` |
| Routes | `apps/api/src/routes/index.ts` | 19 domain routers + `/health` |
| Auth | `middleware/auth.middleware.ts`, `modules/auth/*` | JWT **and** session validation |
| RBAC | `permission.middleware.ts`, `role.middleware.ts`, shared `PERMISSIONS` | Not Supabase RLS |
| DB | `@enterprise/database` Prisma | Same Supabase Postgres |
| Storage | `modules/files/storage/*` | Supabase or local |
| Historical PaaS | root `railway.json` | **Do not use** |

Approximate HTTP surface: **~412 registered routes** across domain routers (plus `/` redirect and `/api/v1/health`).

---

## 2. Why Express cannot be “production-hosted by Supabase Postgres alone”

1. Postgres does not execute Express handlers, middleware, multer, Stripe signature checks, or SSE writers.  
2. Edge Functions are a **separate** Supabase product (Deno runtime, request/CPU/wall-clock limits)—not automatic hosting of `apps/api`.  
3. EliteFlow’s security model is **application RBAC + session**, not “RLS replaces API.”  
4. Background work is **process-local `setInterval`**, which does not run because a database exists.

---

## 3. Global middleware stack (must be preserved or equivalently replaced)

Order from `apps/api/src/app.ts`:

1. `trust proxy = 1`, disable `x-powered-by`  
2. `requestTiming()`  
3. `compression()`  
4. `securityHeadersMiddleware()`  
5. `cors({ origin: getCorsOrigins(), credentials: true, … })`  
6. Stripe **raw body** only on `/api/v1/billing/webhooks/stripe`  
7. `express.json({ limit: "1mb" })`  
8. `cookieParser()`  
9. `csrfProtection`  
10. `GET /` → redirect `WEB_APP_URL`  
11. `apiVersionMiddleware()`  
12. Mount `API_PREFIX` (`/api/v1`) and `/api/v2` → same `apiRouter`  
13. `errorHandler`

Per-route (typical authenticated module):

- `authenticate` — Bearer JWT + **sessionService.validateSession** + hardening / device / MFA enrollment / Zero Trust  
- `authorizePermissions` / `authorizeRoles` / `authorizeAnyPermission`  
- `rateLimit(...)` (Redis-backed)  
- `validate(zod schema)`  
- `asyncHandler(controller)`

**Migration rule:** No route may go live on Edge without an equivalent of auth → session → RBAC → rate limit → validation → error mapping.

---

## 4. Route inventory by domain (prefix `/api/v1`)

| Domain mount | ~Routes | Auth pattern (typical) | Edge Fit (first pass) |
|--------------|---------|------------------------|------------------------|
| `/health` | 1 | Public | **Safe early Edge** |
| `/auth` | 25 | Mixed public + authed; cookies; argon2 | **Redesign** (native crypto, cookies, sessions) |
| `/customer-requests` | 12 | Auth + CLIENT create / ADMIN review | **Good Wave-1 candidate** (preserve service layer) |
| `/projects` | 7 | Auth + permissions | Wave 2 |
| `/tasks` | 10 | Auth + permissions | Wave 2 |
| `/clients` | 15 | Auth + admin portal linking | Wave 2 |
| `/invoices` | 8 | Auth + permissions | Wave 2 |
| `/files` | 19 | Auth + multer upload + stream download | **Redesign upload**; downloads via signed URL preferred |
| `/notifications` | 21 | Auth + queue process | Wave 2 + cron for queue |
| `/billing` | 9 | Auth + **Stripe webhook public** | Webhook = dedicated Edge; rest Wave 2 |
| `/ai` | 12 | Auth + `AI_USE`; **SSE stream** | Non-stream Wave 2; **stream = special design** |
| `/calendar` | 13 | Auth | Wave 3 |
| `/team` | 52 | Auth + HR workflows | Wave 3–4 |
| `/communication` | 56 | Auth + presence/typing | Wave 3–4 (presence may need Realtime) |
| `/security` | 78 | Auth + CSRF token public; heavy admin | Wave 4+ |
| `/settings` | 26 | Auth + avatar upload | Wave 3 |
| `/integrations` | 27 | Auth + **OAuth GET callbacks** | Callbacks early; rest Wave 3 |
| `/reports` | 8 | Auth | Wave 3 |
| `/search` | 1 | Auth | Wave 3 |
| `/public` | 13 | API keys | Wave 3 |
| `/whiteboards` | 12 | Auth | Wave 3 |

Full path lists were extracted from `*.routes.ts` / whiteboards `index.ts` during this audit (method + path). Domain detail is retained in repo under those files; this matrix is the migration planning source of truth for **grouping**, not a substitute for route tests.

### Customer Requests (Phase 2 preserve list)

| Method | Path | Role gate |
|--------|------|-----------|
| GET | `/customer-requests` | `customer-requests:read` |
| GET | `/customer-requests/:id` | `customer-requests:read` |
| POST | `/customer-requests` | create + **CLIENT** |
| PATCH | `/customer-requests/:id` | create + **CLIENT** |
| POST | `/customer-requests/:id/submit` | create + **CLIENT** |
| POST | `/customer-requests/:id/withdraw` | create + **CLIENT** |
| POST | `/customer-requests/:id/attachments` | create + **CLIENT** |
| POST | `/customer-requests/:id/review` | review + ADMIN/SUPER_ADMIN |
| POST | `/customer-requests/:id/clarification` | review + ADMIN/SUPER_ADMIN |
| POST | `/customer-requests/:id/approve` | review + ADMIN/SUPER_ADMIN |
| POST | `/customer-requests/:id/reject` | review + ADMIN/SUPER_ADMIN |
| POST | `/customer-requests/:id/convert` | review + ADMIN/SUPER_ADMIN |

**Do not change business rules** except runtime adapter glue.

---

## 5. Route migration matrix (design)

| Class | Examples | Strategy | Direct port? |
|-------|----------|----------|--------------|
| A — Stateless/read light | `/health`, OpenAPI JSON | Edge Function | Yes |
| B — CRUD + Prisma + RBAC | customer-requests, projects, tasks, invoices | Edge + shared service modules + Postgres pooler | Conditionally (after Prisma/edge data access strategy) |
| C — Cookie/session heavy | `/auth/*` refresh, logout, MFA | Dedicated `auth` Edge function(s); preserve EliteFlow JWT/session | Redesign adapter, keep services |
| D — Multipart upload | `POST /files/upload`, profile docs | **Signed upload to Storage** or Edge multipart → Storage; drop prod local disk | Redesign |
| E — Binary stream download | `/files/:id/download` | Prefer redirect to signed Supabase URL (already partial support) | Prefer redesign |
| F — SSE | `POST /ai/chat/stream` | See AI/SSE plan | Not blind port |
| G — Raw webhook | `POST /billing/webhooks/stripe` | Single Edge function, raw body, signature verify | Yes (isolated) |
| H — OAuth callback | integrations Google/GitHub GET; auth OAuth POST | Edge functions with stable public URLs | Yes with URL config |
| I — Admin security suite | `/security/*` | Late waves; may stay longest on transitional compute | Incremental |
| J — Background-only | session cleanup, retention, SIEM flush | **pg_cron → invoke Edge / SQL**; never `setInterval` in Edge | Redesign |

---

## 6. Dependency compatibility matrix

| Dependency | Used for | Edge / Deno | Action |
|------------|----------|-------------|--------|
| `express` | HTTP framework | Not native long-lived; Hono/Express-on-Edge possible for routing only | Replace listener with Edge `fetch` handler + router |
| `@enterprise/database` / Prisma | ORM | Native query engine / connection model **hostile** to naive Edge deploy | **Redesign:** Prisma Accelerate / driver adapter + pooler, or extract SQL via Supabase client for selected paths—**decision gate** |
| `argon2` | Password hashing | Native addon | Replace with WebCrypto/scrypt/bcryptWASM **or** keep hashing in a tightly scoped runtime that supports it—**decision gate** |
| `multer` + disk | Uploads | Ephemeral FS only | Signed URL / direct Storage upload |
| `ioredis` | Rate limit, CSRF, caches | Needs TCP Redis (e.g. external); not Supabase-native | Keep Redis **or** implement Postgres/atomic rate-limit tables—**do not drop** |
| `jsonwebtoken` / `jose` | JWT | `jose` Edge-friendly | Prefer `jose` everywhere |
| `stripe` | Billing | OK in Edge with care | Dedicated webhook function |
| `@supabase/supabase-js` | Storage/Auth admin | Native fit | Keep |
| `nodemailer` / `resend` | Email | Resend HTTP OK; SMTP less ideal | Prefer HTTP providers on Edge |
| `compression` / `helmet` | HTTP | Reimplement headers in Edge | Port policy, not package |
| `cookie-parser` | Cookies | Manual `Set-Cookie` / parse | Port carefully for Vercel cross-site |
| `otpauth` / `qrcode` | MFA | Generally OK / WASM | Verify in Edge |
| `ua-parser-js` | Device | OK | Keep |
| `file-type` | Magic bytes | OK with buffers | Keep |
| Node `fs` / `os.tmpdir` | Upload temp | Not durable | Eliminate for prod |
| `setInterval` jobs | Background | **Incompatible** | pg_cron / queues |

---

## 7. Background-job migration matrix

| Job | File | Interval (approx) | Supabase-native target | Notes |
|-----|------|-------------------|------------------------|-------|
| Session cleanup | `jobs/session-cleanup.job.ts` | 1h | `pg_cron` → Edge `jobs-session-cleanup` | Call existing `authService.cleanupExpiredSessions` |
| Performance recalc | `jobs/performance-recalc.job.ts` | 30m + reports | `pg_cron` → Edge `jobs-performance` | Heavy; watch wall-clock; may chunk |
| Retention processor | `jobs/retention-processor.job.ts` | 6h | `pg_cron` → Edge `jobs-retention` | Idempotent batches |
| Leave expiration | `jobs/leave-expiration.job.ts` | 1h | `pg_cron` → Edge `jobs-leave-expire` | |
| Backup validation | `jobs/backup-validation.job.ts` | config | `pg_cron` (if enabled) | Skip when flag off |
| Encryption audit | `jobs/encryption-audit.job.ts` | config | `pg_cron` (if enabled) | |
| DR test | `jobs/disaster-recovery-test.job.ts` | config | `pg_cron` (if enabled) | |
| Penetration test | `jobs/penetration-test.job.ts` | config | `pg_cron` (if enabled) | |
| SIEM flush | `shared/security/siem/siem.service.ts` | ~5s timer | **DB queue + cron every N seconds** or provider push on write | Cannot keep 5s `setInterval` in Edge worker lifecycle |
| Notification queue | `notification.dispatcher` / admin process | On-demand + inline | `pg_cron` → `jobs-notification-queue` | Preserve dispatcher semantics |
| AI memory drain | in-memory `setImmediate` | request-scoped | DB queue or drop in-memory assumption | Redesign |
| Outbound webhooks retry | `webhook.service.ts` | `setTimeout` | DB `NotificationQueue`-like table + cron | Redesign |
| Performance debounce | `performance-recalc.queue.ts` | timer | DB flag + cron | Redesign |

**Rule:** Never copy `setInterval` into an Edge Function module and expect parity.

---

## 8. Redis audit

| Use | Mandatory? | Notes |
|-----|------------|-------|
| Distributed rate limiting | **Yes for multi-instance security** | `rate-limit.middleware.ts` + `redis-rate-limiter.service.ts` |
| CSRF store (when Redis configured) | Strongly preferred | Fail-open/memory weakens multi-instance |
| Session hardening / device helpers | Uses Redis client paths | Must not silently disable |
| Leave approval cache | Optional cache; DB is source | Soft |
| AI budget ledger | Redis or memory | Soft but abuse-relevant |

**Design options (choose at approval):**

1. **Retain Redis** (Upstash or other TCP Redis) beside Supabase — not Railway; still compatible with Edge via HTTP Redis REST if TCP blocked.  
2. **Postgres-backed rate limiter** (advisory locks / sliding window tables) — Supabase-native, must match current fail-closed production behavior.  

**Forbidden:** Removing rate limits “because Edge is hard.”

---

## 9. Security / RBAC preservation plan

### Freeze current verified guarantees (Phase 2)

Capture before any cutover (already evidenced by scripts):

- IDOR isolation on customer requests  
- `clientId` server-derived from actor `companyId`  
- CLIENT cannot review / approve / reject / convert  
- CLIENT cannot create ERP projects/tasks or assign employees  
- Attachment URL / managed-file company scoping  
- Unlinked CLIENT blocked  
- Auth and permission failures  

Scripts to re-run after each wave (service or HTTP against new base URL):

- `apps/api/scripts/verify-customer-requests-phase2.ts`  
- `apps/api/scripts/verify-customer-requests-security.ts`  
- `apps/api/scripts/verify-customer-requests-attachments.ts`  
- `apps/api/scripts/verify-customer-requests-notifications.ts`  
- `apps/api/scripts/verify-customer-requests-db-status.ts`  
- `apps/api/scripts/verify-client-portal-onboarding.ts`  

### Non-negotiables

- Do **not** replace EliteFlow RBAC with Supabase RLS as the authorization system.  
- RLS may be added later as defense-in-depth **only with explicit approval**—never as a silent swap.  
- Preserve permission keys: `customer-requests:create|read|review`, `projects:*`, `tasks:*`, `files:*`, etc.  
- Preserve audit logging hooks on sensitive mutations.

---

## 10. Authentication / session migration plan

| Concern | Current | Edge target |
|---------|---------|-------------|
| Access token | HS256 JWT (`JWT_SECRET`) | Same issuer/audience/secret in Supabase secrets |
| Session | DB session row validated every request | Same `sessionService.validateSession` |
| Refresh cookie | `__Secure-refresh-token`, path `/api/v1/auth`, SameSite=None Secure | Must keep cookie attributes for Vercel↔API cross-site |
| CSRF | Double-submit; exempts listed paths | Port exempt list; Stripe + OAuth + stream policy preserved |
| Supabase Auth | JWKS / Admin for OAuth bridging | Keep `integrations/supabase/*` |
| Password hashing | argon2 | Decision gate (native vs portable KDF) |

**Do not** move browser to “Supabase Auth only” without a separate product approval.

---

## 11. File-upload migration plan

Current: multer **disk** temp → virus scan path → Storage provider (`STORAGE_PROVIDER`).

Target (Supabase-native):

1. Production **`STORAGE_PROVIDER=supabase` only**.  
2. Prefer **createManagedFile + signed upload URL** (client uploads bytes to Storage; API stores metadata + ACL).  
3. If Edge multipart retained: buffer to Storage; **no** durable local disk.  
4. Preserve `attachmentSecurityService` / `assertManagedFileForAttachment` / company scope.  
5. Downloads: prefer signed URL redirect over long proxy streams through Edge.

---

## 12. AI / SSE migration plan

**Endpoint:** `POST /api/v1/ai/chat/stream` (`ai.controller.ts` → `text/event-stream`, keep-alive, delta events).

| Option | Description | Risk |
|--------|-------------|------|
| **EF-Stream** | Edge Function returns streaming `ReadableStream` SSE | Possible on Deno; subject to **wall-clock / CPU limits**; may truncate long tool runs |
| **EF-Chunked** | Non-SSE: client polls job id / uses Supabase Realtime channel for tokens | Behavior change; needs web client update |
| **Hybrid hold** | Keep stream on transitional Node until Edge stream proven | Only if a non-Railway Node host were approved (not assumed) |

**Audit conclusion:** Do **not** silently remove streaming.  
**Design default for approval:** Implement **EF-Stream** in a dedicated `ai-chat-stream` function with hard timeouts + graceful `error` SSE event; fall back to documented **EF-Chunked** only if Supabase limits fail verification. Web client changes require explicit approval if contract changes.

Non-stream `POST /ai/chat` can migrate earlier than stream.

---

## 13. Stripe / OAuth migration plan

| Endpoint | Requirement | Edge design |
|----------|-------------|-------------|
| `POST /api/v1/billing/webhooks/stripe` | Raw body + Stripe-Signature | Dedicated function; CSRF exempt; no JSON pre-parse |
| `GET /api/v1/integrations/oauth/callback/google\|github` | Public redirect | Edge; update OAuth app redirect URIs to Supabase Functions URL |
| `POST /api/v1/auth/oauth/callback` | EliteFlow OAuth completion | Auth function group |

Configure `APP_URL` / public API base to Supabase Functions origin (not Railway).

---

## 14. Environment variables (names only — migrate to Supabase secrets)

**Core:** `NODE_ENV`, `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `CORS_ORIGIN`, `WEB_APP_URL`, `FRONTEND_URL`, `APP_URL`, `ENTERPRISE_ENCRYPTION_KEY`  

**Supabase:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_STORAGE_BUCKET`, `STORAGE_PROVIDER`  

**Redis / rate limit:** `REDIS_URL`, `RATE_LIMIT_REDIS_URL`, `RATE_LIMIT_ENABLED`, `RATE_LIMIT_FAIL_OPEN`, …  

**Stripe / email / OAuth / SIEM / AI / virus scan:** existing module configs (unchanged names).

**Vercel public only:** `NEXT_PUBLIC_API_URL` (and other existing `NEXT_PUBLIC_*`).  
**Never** put service role, JWT, DB, Stripe, or encryption secrets in Vercel public env.

---

## 15. Proposed Supabase-native target layout (Phase 2 design)

```
supabase/
  config.toml
  migrations/          # optional companions only; Prisma remains SoT unless approved
  functions/
    health/
    auth/              # auth domain
    customer-requests/ # Phase 2 preserve
    files/
    billing-stripe-webhook/
    ai-chat/
    ai-chat-stream/
    jobs-session-cleanup/
    jobs-notification-queue/
    ...
  functions/_shared/   # ported middleware adapters + re-exported domain services
```

**Reuse strategy:** Extract/adapt existing `*.service.ts` / repositories behind a runtime-agnostic layer; Edge handlers become thin adapters. **Do not duplicate business rules.**

**Prisma strategy (decision gate before any implement wave):**

- **G1:** Prisma + Accelerate / serverless driver against Supabase pooler from Edge  
- **G2:** Shared “data access” package using `@supabase/supabase-js` only for migrated domains (higher rewrite cost)  
- **G3:** Transitional dual-run (forbidden to use Railway; would require another approved Node host—not assumed)

Without resolving G1/G2/G3, implementation must not start.

---

## 16. Incremental migration waves (design only)

| Wave | Scope | Exit criteria |
|------|-------|---------------|
| 0 | Audit + design (this doc) + decision gates | Human approval |
| 1 | `health` + Stripe webhook + OAuth callbacks + scaffolding `_shared` auth adapter | Smoke on Supabase URL |
| 2 | `customer-requests` full + notifications create path | Phase 2 security scripts PASS against new base |
| 3 | `files` signed-upload path + projects/tasks/invoices read/write | Portal smoke |
| 4 | `auth` cookie/refresh parity | Login/refresh from Vercel |
| 5 | Remaining domains | Route coverage checklist |
| 6 | Jobs via pg_cron | Job equivalence checks |
| 7 | AI non-stream then stream | AI verification |
| 8 | Point `NEXT_PUBLIC_API_URL` → Supabase API; Vercel prod | Browser E2E |
| 9 | Decommission Express **production** dependency (Express may remain for local/dev) | Explicit approval |

---

## 17. Rollback strategy

1. Keep Vercel `NEXT_PUBLIC_API_URL` switch **last** and reversible.  
2. Per-wave feature flags or path-based routing (web can target old vs new base only after approval).  
3. No destructive schema changes for hosting.  
4. Express codebase remains in repo until cutover is verified—**not deleted**.  
5. If Edge wave fails security scripts → revert web env; fix Edge; do not weaken RBAC to ship.

---

## 18. Risk assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Prisma/argon2 incompatible with Edge | **Critical** | Resolve decision gates G1–G3 before Wave 2 |
| Blind full rewrite breaks RBAC | **Critical** | Adapter pattern; re-run security scripts each wave |
| SSE truncated by Edge limits | High | Dedicated stream function + limits testing; alternate design documented |
| Rate limit removed accidentally | High | Redis or pg limiter required in prod |
| Cookie/CORS break on new origin | High | Early auth wave + Vercel cookie tests |
| Job gaps (session cleanup) | High | pg_cron before Express process shutdown |
| Scope explosion (~400 routes) | High | Waves; no big-bang |
| Accidental Railway use | Critical | Hard ban; no `*.up.railway.app` |

---

## 19. Verification plan (post-implementation — not executed now)

A. API health B. Auth C. RBAC D. Tenant isolation E. Customer Requests E2E F. Attachments G. Notifications H. Files I. AI J. Webhooks K. Jobs L. Rate limiting M. Security regression N. Vercel browser → Supabase API  

**Production readiness claim is forbidden** until N passes.

---

## 20. What this audit does **not** do

- No code migration  
- No Supabase function deploy  
- No Vercel `NEXT_PUBLIC_API_URL` change  
- No DB migrations  
- No RBAC changes  
- No Railway actions  
- No Phase 3 product work  
- No deletion of Express or historical Railway files  

---

## 21. Decision gates — human approval required before Phase 3 (implementation)

Please approve explicitly:

1. **Data access on Edge:** G1 (Prisma serverless) vs G2 (Supabase client) vs other.  
2. **Password hashing:** portable KDF vs scoped native runtime.  
3. **Redis:** keep external Redis vs Postgres-backed limiter design.  
4. **AI streaming:** EF-Stream first vs contract-changing EF-Chunked.  
5. **Wave order** (recommended Wave 0→9 above) or revised order.  
6. Confirmation that **Railway remains forbidden** and Express is not deleted until cutover verified.

---

## Document control

| Field | Value |
|-------|-------|
| Artifact | `docs/SUPABASE_API_MIGRATION_AUDIT.md` |
| Phases completed herein | Migration Phase 1 (Audit) + Phase 2 (Design) |
| Phases **not** started | Implementation, Supabase deploy, Vercel API cutover, GitHub migration commits |

**WAITING FOR HUMAN APPROVAL — NO CODE, DATABASE, RBAC, OR DEPLOYMENT CHANGES MADE FOR THIS MIGRATION.**
