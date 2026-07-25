# ADR-005: Why Monorepo Architecture

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application consists of a Next.js frontend (`apps/web`), an Express backend (`apps/api`), and multiple shared packages (`packages/shared`, `packages/database`, `packages/config`, `packages/tsconfig`). These applications share types, validation schemas, constants, database models, and environment configuration.

The project will be developed by a team over multiple years with 20+ feature modules spanning both frontend and backend. Changes frequently require coordinated updates across layers — for example, adding a new "Projects" module requires frontend components, API endpoints, database schema, shared types, and validation schemas.

---

## Problem

We need a repository structure that can:

- Share TypeScript types and Zod validation schemas between frontend and backend without duplication
- Allow atomic commits that update API contracts and their consumers simultaneously
- Maintain consistent tooling (ESLint, Prettier, TypeScript configs) across all packages
- Enable independent deployment of frontend (Vercel) and backend (separate host) while sharing code
- Scale to additional apps or services (mobile API, admin CLI, worker processes) without new repositories
- Simplify dependency management — one `node_modules`, one lockfile
- Support incremental builds and caching across packages

Separate repositories (polyrepo) would force us to publish shared packages to a registry, version them independently, and coordinate releases across repos — creating friction and type drift.

---

## Decision

We will use a **monorepo architecture** managed with **pnpm workspaces** and **Turborepo**.

Structure:

```
enterprise-business-management/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend
├── packages/
│   ├── shared/       # Types, schemas, constants, utils
│   ├── database/     # Prisma schema & client
│   ├── config/       # Environment validation
│   └── tsconfig/     # Shared TypeScript configs
├── pnpm-workspace.yaml
└── turbo.json
```

Key tooling choices:

- **pnpm workspaces** — efficient disk usage via symlinks; strict dependency resolution
- **Turborepo** — parallel builds, remote caching, task dependency graph
- **Shared `tsconfig`** — consistent compiler settings via `packages/tsconfig`
- **Internal package references** — `"@shared/types": "workspace:*"` in package.json

---

## Consequences

### Positive

- **Single source of truth** — types, schemas, and constants defined once in `packages/shared`
- **Atomic changes** — one PR can update API endpoint, frontend consumer, and shared types together
- **Consistent tooling** — one ESLint config, one Prettier config, one TypeScript version
- **Simplified CI** — Turborepo runs only affected package builds/tests on change
- **Developer experience** — clone one repo, run one install, work on any package
- **Scalability** — add new apps (`apps/mobile-api`, `apps/worker`) or packages without new repos
- **No publish overhead** — shared packages are consumed via workspace references, not npm publish

### Negative

- **Repository size** — grows over time; requires discipline to keep packages focused
- **CI complexity** — must configure Turborepo pipeline for correct build order
- **Access control** — cannot restrict repo access per app (all developers see all code)
- **Initial setup** — monorepo tooling (pnpm, Turborepo) adds configuration overhead

### Neutral

- Frontend and backend deploy independently despite sharing a repository
- Requires `pnpm` as package manager (not npm or yarn) for workspace support

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Polyrepo (separate repos)** | Type drift between FE/BE; shared package versioning overhead; atomic cross-layer changes impossible |
| **npm workspaces (without Turborepo)** | No build caching or task orchestration; slower CI at scale |
| **Yarn workspaces** | pnpm preferred for stricter dependency isolation and disk efficiency |
| **Nx** | More complex than needed for 2 apps + 4 packages; Turborepo sufficient |
| **Lerna** | Legacy tool; Turborepo is the modern replacement with better caching |
| **Git submodules** | Poor developer experience; version management nightmare |

---

## Why This Decision Is Best

A monorepo is the correct architecture for a full-stack TypeScript application where **frontend and backend share types, validation, and constants**. The alternative — publishing `@company/shared-types` to a private npm registry and versioning it independently — introduces release coordination overhead that slows development and causes type drift.

For a 20+ module enterprise application, a schema change in `packages/shared` must propagate instantly to both `apps/web` and `apps/api`. In a monorepo, this is a single commit. In a polyrepo, it is a multi-repo release cycle.

pnpm workspaces + Turborepo provide enterprise-grade monorepo tooling without the complexity of Nx. The structure scales naturally — when we add background workers, mobile APIs, or CLI tools, they become new entries in `apps/` consuming the same shared packages.
