# Phase D3 — Backend Railway Deployment Checklist

**Repository:** https://github.com/AliAhmad-Web/eliteflow-enterprise  
**Scope:** Backend (`apps/api`) only — do not deploy web or mobile.  
**Status:** D3.1 packaging fix verified. **Awaiting approval before connecting Railway.**

---

## Production readiness verdict

| Check | Result | Notes |
|-------|--------|-------|
| Backend Ready | **YES** | D3.1 packaging fix applied |
| Build (compile) | **PASS** | `database` → `shared` → `api` |
| Database config | **PASS** | Prisma + `DATABASE_URL`; migrate via `db:migrate:deploy` |
| Supabase config | **PASS** | `SUPABASE_URL` + service role key wired |
| JWT config | **PASS** | `assertAuthConfig()` enforces secret ≥ 32 chars + prod CORS |
| Storage config | **PASS** | Use `STORAGE_PROVIDER=supabase` in production |
| Health endpoint | **PASS** | `GET /api/v1/health` → `{ status: "ok", timestamp }` |
| Production start | **PASS** | `npm run start --workspace=@enterprise/api` under plain Node |

---

## Packaging fix (D3.1 — resolved)

`@enterprise/database` now builds to `dist/` (Prisma generate + `tsc` + copy generated client). Package exports point at compiled JS. Root `build` / `postinstall` include the database package.

---

## Command corrections (important)

| Intent | User-proposed | Actual / recommended |
|--------|---------------|----------------------|
| Generate Prisma | `npm run db:generate` | ✅ Correct (root) |
| Build | `npm run build` | ⚠️ Root build also builds **web**. Backend-only: see below |
| Start | `npm run start` | ❌ **Missing at root**. Use workspace start (after packaging fix) |

### Recommended Railway commands

```bash
# Install (repo root)
npm ci

# Backend build (database build includes prisma generate)
npm run build --workspace=@enterprise/database
npm run build --workspace=@enterprise/shared
npm run build --workspace=@enterprise/api

# Pre-deploy / migrate (when DATABASE_URL is reachable)
npm run db:migrate:deploy

# Start
npm run start --workspace=@enterprise/api
# → node apps/api/dist/server.js
```

Suggested Railway service settings (repo root as Root Directory):

| Setting | Value |
|---------|--------|
| Build Command | `npm run build --workspace=@enterprise/database && npm run build --workspace=@enterprise/shared && npm run build --workspace=@enterprise/api` |
| Pre-Deploy Command | `npm run db:migrate:deploy` |
| Start Command | `npm run start --workspace=@enterprise/api` |
| Watch Paths | `/apps/api/**`, `/packages/database/**`, `/packages/shared/**` |

Also set `NPM_CONFIG_PRODUCTION=false` (or ensure `typescript` / `prisma` CLI remain available at build/pre-deploy), because API `typescript` and database `prisma` CLI live in `devDependencies`.

---

## Environment variables

### Mapped from your required list → actual API names

| Your variable | Used by API? | Correct production name / action |
|---------------|--------------|----------------------------------|
| `DATABASE_URL` | ✅ Yes | Keep |
| `JWT_SECRET` | ✅ Yes | Keep (≥ 32 characters) |
| `CORS_ORIGIN` | ✅ Yes | HTTPS web origin(s), e.g. `https://app.eliteflow.app` (comma-separated OK) |
| `NEXT_PUBLIC_APP_URL` | ❌ Web only | Use **`FRONTEND_URL`** on the API instead |
| `SUPABASE_URL` | ✅ Yes | Keep |
| `SUPABASE_ANON_KEY` | ❌ Web only | API needs **`SUPABASE_SERVICE_ROLE_KEY`** (already listed) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Keep |
| `STORAGE_PROVIDER` | ✅ Yes | Set to **`supabase`** in production |
| `RESEND_API_KEY` | ✅ Yes | Keep |
| `RESEND_FROM_EMAIL` | ❌ Wrong name | Use **`EMAIL_FROM`** (e.g. `EliteFlow <noreply@your-domain.com>`) |
| `RESEND_TO_EMAIL` | ❌ Not used | Omit (not referenced by API) |

### Required / strongly recommended for production API

```env
NODE_ENV=production
PORT=4000
# Railway usually injects PORT — app reads process.env.PORT

DATABASE_URL=postgresql://...
JWT_SECRET=<min-32-char-secret>
JWT_ISSUER=enterprise-bms-api
JWT_AUDIENCE=enterprise-bms-web

CORS_ORIGIN=https://app.eliteflow.app
FRONTEND_URL=https://app.eliteflow.app
APP_URL=https://api.eliteflow.app

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWKS_URL=https://xxxx.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_STORAGE_BUCKET=files
STORAGE_PROVIDER=supabase

RESEND_API_KEY=...
EMAIL_FROM=EliteFlow <noreply@your-domain.com>
APP_NAME=EliteFlow

SETTINGS_ENCRYPTION_KEY=<strong-secret>
INTEGRATIONS_OAUTH_STATE_SECRET=<strong-secret>
```

### Production CORS rules (enforced at boot)

- `CORS_ORIGIN` **required** when `NODE_ENV=production`
- Must be HTTPS only — no `localhost`, no `http://`
- Credentials enabled (`cors({ credentials: true })`)

### Do not set on API (web / mobile only)

- `NEXT_PUBLIC_*`
- `SUPABASE_ANON_KEY` (unless a future API change needs it)
- `EXPO_PUBLIC_*`

---

## Verification matrix

### 1. Production start command

- Script: `apps/api` → `"start": "node dist/server.js"`
- Boot: `assertAuthConfig()` then `listen(PORT)`
- **Current result:** FAIL (database package resolution)

### 2. Production build output

- `apps/api/dist/server.js` exists after `tsc`
- `packages/shared/dist` exists after shared build
- Prisma client: `packages/database/src/generated/client` via `npm run db:generate`
- Root `npm run build` also builds web — avoid for backend-only Railway service

### 3. Database

- Prisma schema uses `env("DATABASE_URL")`
- Deploy migrations: `npm run db:migrate:deploy`
- Prefer Railway Postgres plugin or managed Postgres; use public URL for migrate if private network timing requires it

### 4. Supabase

- Config: `apps/api/src/config/supabase.config.ts`
- OAuth / storage need URL + service role key
- Storage provider selects Supabase when `STORAGE_PROVIDER=supabase` and credentials present

### 5. JWT

- `JWT_SECRET` required, length ≥ 32
- Issuer / audience defaults exist
- Production refuses insecure CORS origins at startup

### 6. File storage

- Production: `STORAGE_PROVIDER=supabase`
- Local disk (`local`) is for development; ephemeral on Railway

### 7. Health endpoint

```http
GET /api/v1/health
```

Expected:

```json
{ "status": "ok", "timestamp": "<iso>" }
```

After deploy, probe: `https://<railway-or-custom-host>/api/v1/health`

---

## Railway setup steps (after approval + packaging fix)

1. Create Railway project from GitHub repo `AliAhmad-Web/eliteflow-enterprise`
2. Add **one** service for the API (not web, not mobile)
3. Add PostgreSQL plugin (or attach external `DATABASE_URL`)
4. Set Root Directory to repo root (shared monorepo)
5. Configure Build / Pre-Deploy / Start commands as above
6. Set all production environment variables
7. Attach custom domain `api.eliteflow.app` (or use temporary `*.up.railway.app`)
8. Deploy once, then verify health endpoint
9. Confirm CORS allows the future web origin only

**Custom domain expectation:** `https://api.eliteflow.app`  
**Temporary fallback:** Railway-provided HTTPS URL

---

## Post-deploy smoke checks

- [ ] `GET /api/v1/health` → 200 `ok`
- [ ] API boots without JWT/CORS errors in logs
- [ ] Prisma migrate deploy succeeded
- [ ] `[storage] Provider: supabase` in logs
- [ ] Login/signup from allowed CORS origin (after web is deployed later)
- [ ] File upload uses Supabase (no local `storage/` reliance)

---

## Remaining blockers summary

1. ~~BLOCKER: `@enterprise/database` not Node-runnable~~ — **FIXED in D3.1**
2. **CONFIG:** Root `npm run start` does not exist — use workspace start.
3. **CONFIG:** Prefer backend-only build on Railway (or full root build if acceptable).
4. **ENV NAMING:** Replace `NEXT_PUBLIC_APP_URL` → `FRONTEND_URL`; `RESEND_FROM_EMAIL` → `EMAIL_FROM`; drop `RESEND_TO_EMAIL` / `SUPABASE_ANON_KEY` for API.
5. **OPS:** Ensure Prisma CLI + TypeScript available during Railway build / pre-deploy (`NPM_CONFIG_PRODUCTION=false` or move tools to dependencies).

---

## Approval gate

- [x] Packaging fix for `@enterprise/database` merged (local — commit when approved)
- [x] Local verification: `npm run start --workspace=@enterprise/api` listens successfully
- [ ] Env var names confirmed with operator
- [ ] **User approval to connect Railway**

No automatic deploy in this phase.
