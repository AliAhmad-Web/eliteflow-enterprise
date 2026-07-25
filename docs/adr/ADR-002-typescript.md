# ADR-002: Why TypeScript

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application spans a monorepo with a Next.js frontend, Express backend, shared packages, Prisma database layer, and 20+ feature modules. Multiple developers will work on this codebase over years. Data flows across layers — from PostgreSQL through Prisma, Express services, REST APIs, TanStack Query hooks, and React components.

The project explicitly requires **strict TypeScript** with no `any` types, enterprise naming conventions, and shared type definitions between frontend and backend.

---

## Problem

We need a language that can:

- Catch type errors at compile time across a large, multi-package codebase
- Provide shared contracts between frontend API consumers and backend API producers
- Enable safe refactoring across 20+ modules without runtime surprises
- Support strict null checking and exhaustive switch handling for role/permission enums
- Improve developer experience with autocompletion and inline documentation
- Scale with team size — new developers onboard faster with self-documenting types
- Integrate natively with our entire stack (Next.js, React, Express, Prisma, Zod, TanStack Query)

JavaScript alone cannot enforce API contracts, shared enums, or validation schema types across packages. Runtime errors from type mismatches in an enterprise billing or auth system are unacceptable.

---

## Decision

We will use **TypeScript with strict mode enabled** across the entire monorepo.

Key configuration choices:

- **`strict: true`** in all `tsconfig.json` files
- **Shared types** in `packages/shared/src/types/` consumed by both `apps/web` and `apps/api`
- **Prisma-generated types** for all database models
- **Zod-inferred types** (`z.infer<typeof schema>`) for validation — single source of truth
- **No `any`** — use `unknown` with type guards when type is genuinely unknown
- **Exhaustive switch** — `never` check in default cases for union types and enums
- **Path aliases** (`@/`, `@shared/`, `@database/`) for clean imports across packages

---

## Consequences

### Positive

- **Compile-time safety** — type errors caught before deployment, not in production
- **Shared contracts** — frontend and backend agree on API request/response shapes via `packages/shared`
- **Refactoring confidence** — renaming a field propagates errors to all usages instantly
- **Self-documenting code** — types serve as inline documentation for functions and API endpoints
- **IDE support** — autocompletion, go-to-definition, and inline errors accelerate development
- **Ecosystem alignment** — every tool in our stack (Next.js, Prisma, Zod, TanStack Query) has first-class TypeScript support

### Negative

- **Build time** — TypeScript compilation adds to CI pipeline duration
- **Initial overhead** — defining types for all entities, API responses, and form schemas takes upfront effort
- **Complexity** — advanced types (generics, conditional types) can be hard to read for junior developers
- **Third-party gaps** — some npm packages have incomplete or missing type definitions

### Neutral

- TypeScript compiles to JavaScript — no runtime performance difference
- Team must agree on type conventions documented in `docs/development/coding-standards.md`

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **JavaScript (ES Modules)** | No compile-time safety; type drift between FE and BE inevitable at scale |
| **JSDoc + TypeScript checking** | Partial solution; no shared package type enforcement; inconsistent adoption |
| **Flow** | Declining adoption; poor ecosystem support compared to TypeScript |
| **ReScript / Elm** | Different paradigm; incompatible with React/Next.js ecosystem; steep hiring barrier |
| **Python (Django/FastAPI) for backend** | Would break monorepo type sharing; team aligned on Node.js full-stack TypeScript |

---

## Why This Decision Is Best

TypeScript is the industry standard for enterprise Node.js and React applications. For a project with **shared packages, 20+ modules, four user roles, and strict validation requirements**, the ability to share types and schemas across frontend and backend is not a convenience — it is a requirement.

A type mismatch in an invoice total calculation or a permission check is a production incident. TypeScript prevents these at build time. Combined with Zod for runtime validation and Prisma for database types, we achieve end-to-end type safety from database row to UI component.

Strict TypeScript is the foundation that makes our monorepo, shared packages, and feature-based architecture work reliably at enterprise scale.
