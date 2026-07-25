# ADR-019: Why Environment Validation

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application depends on numerous environment variables: database connection strings, JWT secrets, Supabase credentials, Stripe API keys, OpenAI keys, Resend email keys, Cloudinary credentials, Google OAuth secrets, and public frontend URLs. These variables are required by both the Next.js frontend and Express backend across development, staging, and production environments.

Environment misconfiguration is one of the most common causes of production incidents — a missing `DATABASE_URL` causes cryptic connection errors, a wrong `JWT_SECRET` invalidates all user sessions, and an exposed `STRIPE_SECRET_KEY` in the frontend bundle is a security breach.

---

## Problem

We need an environment configuration strategy that can:

- Validate all required environment variables at application startup
- Fail fast with clear error messages when variables are missing or malformed
- Separate client-safe variables (`NEXT_PUBLIC_*`) from server secrets
- Prevent secrets from leaking into the frontend bundle
- Provide type-safe access to environment variables in TypeScript
- Document all required variables for each environment (dev, staging, production)
- Support different configurations per environment without code changes
- Scale as new integrations are added (each bringing new env vars)

Without validation, a missing `RESEND_API_KEY` is discovered only when a user triggers a "forgot password" email — in production. A typo in `DATABASE_URL` causes a runtime crash with an unhelpful Prisma error message.

---

## Decision

We will implement **Zod-validated environment configuration** in a dedicated `packages/config/` package.

### Architecture:

```
packages/config/
├── src/
│   ├── env.schema.ts         # Master Zod schema (all variables)
│   ├── client.env.ts         # Client-safe subset (NEXT_PUBLIC_*)
│   ├── server.env.ts         # Server-only secrets
│   └── index.ts              # Validated, typed exports
```

### Validation flow:

```
Application starts
  → packages/config loads .env
  → Zod schema validates all variables
  → Missing/invalid? → App crashes with clear error message
  → Valid? → Typed env object exported for use
```

### Environment files:

```
# Root (reference only)
.env.example

# Frontend
apps/web/.env.local.example
  NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend
apps/api/.env.example
  DATABASE_URL=postgresql://...
  JWT_SECRET=your-secret-min-32-chars
  JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
  OPENAI_API_KEY=sk-...
  STRIPE_SECRET_KEY=sk_test_...
  RESEND_API_KEY=re_...
  CLOUDINARY_CLOUD_NAME=...
  CLOUDINARY_API_KEY=...
  CLOUDINARY_API_SECRET=...
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  PORT=4000
  NODE_ENV=development
```

### Zod schema example:

```typescript
// packages/config/src/server.env.ts
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  // ...
});

export const serverEnv = serverEnvSchema.parse(process.env);
```

### Security rules:

| Rule | Enforcement |
|------|-------------|
| Secrets never in `NEXT_PUBLIC_*` | Zod schema separation; code review |
| `.env` files in `.gitignore` | Git ignore + `.env.example` templates |
| Production secrets in CI/CD vault | GitHub Secrets / Vercel env vars |
| Minimum secret length | Zod `min(32)` on JWT secrets |
| Format validation | `startsWith('sk-')` for API keys |

---

## Consequences

### Positive

- **Fail fast** — app refuses to start with missing/invalid config; no silent failures
- **Clear errors** — `"JWT_SECRET: Required"` instead of cryptic runtime crashes
- **Type safety** — `serverEnv.DATABASE_URL` is typed as `string`, not `string | undefined`
- **Documentation** — Zod schema IS the documentation of required variables
- **Security** — client/server separation enforced at the schema level
- **Onboarding** — `.env.example` files + Zod schema = complete setup guide

### Negative

- **Startup dependency** — app cannot start without all required vars (even for unrelated features)
- **Schema maintenance** — new integrations require updating the Zod schema
- **Optional vars complexity** — features not used in dev still require placeholder values (or conditional schemas)

### Neutral

- Different env files per environment (`.env.local`, `.env.staging`, `.env.production`)
- CI/CD pipelines inject secrets from vault, not from files

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **No validation (raw `process.env`)** | `undefined` secrets cause runtime crashes with unhelpful errors |
| **dotenv only** | Loads variables but does not validate types or presence |
| **envalid** | Good library but Zod already in our stack; no need for another dependency |
| **Manual if-checks** | Scattered validation; no type generation; inconsistent error messages |
| **12-factor env vars without schema** | No type safety; no format validation; no fail-fast |
| **Config files (JSON/YAML)** | Not standard for Node.js; secrets in files are a security risk |

---

## Why This Decision Is Best

Environment validation with Zod is a zero-cost addition that prevents an entire class of production incidents. For an application integrating **8+ external services** (Supabase, Stripe, OpenAI, Resend, Cloudinary, Google), each requiring API keys and configuration, the probability of a missing or misconfigured variable approaches certainty without validation.

`packages/config` as a shared package means both `apps/web` and `apps/api` use the same validation logic. The frontend validates `NEXT_PUBLIC_*` vars; the backend validates server secrets. Both fail fast with clear messages.

The Zod schema serves triple duty: runtime validation, TypeScript type generation, and living documentation. When a new developer clones the repo, they run the app, see `"STRIPE_SECRET_KEY: Required"`, check `.env.example`, and fix it in 30 seconds. Without validation, they would see a Stripe authentication error only when testing invoice payment — hours or days later.
