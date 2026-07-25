# ADR-016: Why Shared Packages

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application is a monorepo (ADR-005) with a Next.js frontend (`apps/web`), an Express backend (`apps/api`), and multiple internal packages. Both applications need the same TypeScript types, Zod validation schemas, role/permission constants, status enums, and utility functions.

Without shared packages, these definitions would be duplicated — leading to type drift, inconsistent validation, and maintenance nightmares across 20+ modules.

---

## Problem

We need a mechanism to share code between frontend and backend that can:

- Eliminate duplicate type definitions (e.g., `Client`, `Project`, `Invoice` types defined in both apps)
- Ensure validation schemas are identical on frontend forms and backend API endpoints
- Share constants (roles, permissions, status enums, API endpoints) without copy-paste
- Share utility functions (formatCurrency, formatDate) used in both UI and API responses
- Maintain a single source of truth that compiles in both Next.js and Node.js environments
- Support independent versioning within the monorepo via workspace references
- Prevent shared packages from importing application-specific code (one-way dependency)

The cost of type drift in an enterprise application is high — a frontend sending `{ clientName }` while the backend expects `{ name }` causes production bugs that TypeScript should catch at build time.

---

## Decision

We will create **shared packages** in `packages/` consumed by both `apps/web` and `apps/api` via pnpm workspace references.

### Package structure:

```
packages/
├── shared/                 # Types, schemas, constants, utils
│   └── src/
│       ├── types/          # Shared TypeScript interfaces
│       ├── schemas/        # Zod validation schemas
│       ├── constants/      # Roles, permissions, status enums
│       ├── utils/          # formatCurrency, formatDate, slugify
│       └── index.ts
│
├── database/               # Prisma schema & client
│   └── src/
│       ├── client.ts
│       └── index.ts
│
├── config/                 # Environment validation
│   └── src/
│       ├── env.schema.ts
│       ├── client.env.ts
│       └── server.env.ts
│
└── tsconfig/               # Shared TypeScript configs
    ├── base.json
    ├── nextjs.json
    └── node.json
```

### Consumption pattern:

```json
// apps/web/package.json
{
  "dependencies": {
    "@shared/types": "workspace:*",
    "@database/client": "workspace:*",
    "@config/env": "workspace:*"
  }
}

// apps/api/package.json
{
  "dependencies": {
    "@shared/types": "workspace:*",
    "@database/client": "workspace:*",
    "@config/env": "workspace:*"
  }
}
```

### Import rules:

```
✅ apps/web → packages/shared
✅ apps/api → packages/shared
✅ apps/api → packages/database
✅ apps/web → packages/config (client env only)
✅ apps/api → packages/config (server env only)

❌ packages/shared → apps/web
❌ packages/shared → apps/api
❌ packages/shared → packages/database
❌ apps/web → apps/api (use HTTP API)
```

---

## Consequences

### Positive

- **Zero type drift** — `Client` type defined once; frontend and backend always agree
- **Single validation source** — Zod schema in `packages/shared` validates forms and API requests
- **Atomic changes** — update a type and both apps fail to compile until updated
- **No publish step** — workspace references resolve instantly during development
- **Testable in isolation** — shared utils and schemas tested independently
- **Onboarding clarity** — new developers know shared code lives in `packages/`

### Negative

- **Build dependency** — changes to shared packages require rebuilding dependent apps
- **Bundle consideration** — frontend must tree-shake unused shared code (mitigated by modular exports)
- **Scope discipline** — shared packages must stay generic; feature-specific code does not belong here
- **Circular dependency risk** — strict import rules must be enforced (shared never imports from apps)

### Neutral

- Shared packages are private (not published to npm)
- Each package has its own `package.json` and `tsconfig.json`

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Duplicate types in each app** | Type drift inevitable; validation inconsistencies; double maintenance |
| **Published npm package** | Release coordination overhead; versioning complexity; slower iteration |
| **Git submodules** | Poor DX; version management nightmare; merge conflicts |
| **Code generation from OpenAPI** | Generates types but not validation schemas or constants; additional tooling |
| **Single app (no sharing needed)** | Violates separation of frontend and backend; not our architecture |
| **Symlinks without workspace** | Fragile; no dependency resolution; no build orchestration |

---

## Why This Decision Is Best

Shared packages are the cornerstone of our monorepo architecture. Without them, the primary benefit of a monorepo — **a single source of truth for types and validation** — is lost.

When a developer adds a `status` field to the `Project` type in `packages/shared/src/types/project.types.ts`, TypeScript immediately shows errors in every frontend component and backend service that uses `Project`. The Zod schema in `packages/shared/src/schemas/project.schema.ts` validates the field on both the React form and the Express endpoint. This is not convenience — it is the mechanism that prevents entire categories of production bugs.

The four shared packages (`shared`, `database`, `config`, `tsconfig`) each own a specific concern. This separation prevents a single "god package" and keeps dependencies clean. Combined with pnpm workspaces and Turborepo, shared packages provide enterprise-grade code sharing without the overhead of a private npm registry.
