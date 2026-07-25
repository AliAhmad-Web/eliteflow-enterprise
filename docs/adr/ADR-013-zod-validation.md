# ADR-013: Why Zod Validation

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application requires input validation at multiple layers: frontend forms (React Hook Form), backend API requests (Express middleware), environment variables (startup), and shared type definitions. Validation rules must be consistent — a client email validated on the frontend must use the exact same rules on the backend.

The monorepo architecture (ADR-005) with shared packages (ADR-016) makes it possible to define validation schemas once and consume them across frontend and backend.

---

## Problem

We need a validation library that can:

- Define schemas that work on both frontend (form validation) and backend (request validation)
- Generate TypeScript types from schemas (`z.infer<typeof schema>`)
- Validate complex nested objects (invoice with line items, project with milestones)
- Provide clear, user-friendly error messages
- Integrate with React Hook Form via resolver
- Integrate with Express middleware for request validation
- Validate environment variables at application startup
- Support custom validators (password strength, file type, currency format)
- Compose schemas — reuse `emailSchema`, `passwordSchema` across auth, user, and client modules

Without a shared validation layer, frontend and backend validation rules drift apart, leading to inconsistent user experiences and security gaps.

---

## Decision

We will use **Zod** as the single validation library across the entire application.

Key implementation choices:

- **Shared schemas** in `packages/shared/src/schemas/` — used by both frontend and backend
- **Feature schemas** in `features/*/schemas/` — for feature-specific validation extending shared schemas
- **Backend validation** via `validate.middleware.ts` — Express middleware applies Zod schemas to `req.body`, `req.query`, `req.params`
- **Frontend validation** via `@hookform/resolvers/zod` — React Hook Form uses the same schemas
- **Environment validation** in `packages/config/` — Zod validates all env vars at startup
- **Type inference** — `type ClientFormValues = z.infer<typeof clientSchema>` replaces manual type definitions

### Schema organization:

```
packages/shared/src/schemas/
├── auth.schema.ts          # login, signup, reset password
├── user.schema.ts          # user profile, update
├── client.schema.ts        # client CRUD
├── project.schema.ts       # project CRUD
├── task.schema.ts          # task CRUD
├── invoice.schema.ts       # invoice with line items
└── index.ts

packages/config/src/
├── env.schema.ts           # all environment variables
├── client.env.ts           # NEXT_PUBLIC_* vars
└── server.env.ts           # server-only secrets
```

### Reusable primitives:

```typescript
// packages/shared/src/schemas/common.schema.ts
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/);
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
```

---

## Consequences

### Positive

- **Single source of truth** — one schema validates frontend forms and backend requests
- **Type generation** — `z.infer<>` eliminates duplicate type definitions
- **Composable** — base schemas extended and reused across modules
- **Clear error messages** — custom messages per field, per validation rule
- **Runtime + compile-time safety** — TypeScript types from schemas, runtime validation at boundaries
- **Environment safety** — app fails fast at startup if env vars are missing or invalid
- **Ecosystem** — integrates with React Hook Form, Express, and Prisma

### Negative

- **Runtime overhead** — validation runs on every request and form submission (negligible for most cases)
- **Schema maintenance** — schema changes must be coordinated across frontend and backend
- **Bundle size** — ~13 KB gzipped (included in both frontend and backend bundles)
- **Complex schemas** — deeply nested validation (invoice line items) can become verbose

### Neutral

- Zod schemas in `packages/shared` are the contract between frontend and backend
- Backend middleware rejects invalid requests before they reach the service layer

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Yup** | No native TypeScript type inference; less ergonomic API; declining adoption |
| **Joi** | Node.js only; no frontend usage; no `z.infer` equivalent |
| **class-validator** | Decorator-based; requires classes; poor frontend compatibility |
| **AJV (JSON Schema)** | JSON Schema syntax is verbose; no TypeScript inference; separate type definitions needed |
| **Superstruct** | Smaller ecosystem; no React Hook Form resolver; less community support |
| **Manual validation** | Duplicated logic; frontend/backend drift; no type generation |

---

## Why This Decision Is Best

Zod is the validation library built for TypeScript. Its `z.infer<typeof schema>` feature is the killer capability for our monorepo — **define the validation rules once, get TypeScript types and runtime validation everywhere**.

When a developer adds a `phone` field to the client schema in `packages/shared`, three things happen automatically: the frontend form validates it, the backend rejects invalid values, and the TypeScript type includes `phone`. No manual synchronization. No drift.

For an enterprise application where data integrity is critical — invoice amounts, user permissions, payment details — having identical validation at every boundary (form, API, environment) is not optional. Zod makes this the default, not an afterthought.
