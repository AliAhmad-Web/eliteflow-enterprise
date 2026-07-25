# ADR-008: Why Prisma ORM

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application uses PostgreSQL as its primary database, hosted via Supabase. The data model is complex — spanning users, roles, permissions, clients, projects, tasks, invoices, payments, notifications, files, calendar events, team management, and audit logs. The database layer must support migrations, type-safe queries, relationship management, and seeding.

The ORM lives in `packages/database/` as a shared monorepo package, consumed by the Express backend and potentially by Next.js server-side code.

---

## Problem

We need a database access layer that can:

- Provide type-safe database queries aligned with our TypeScript strict mode
- Manage schema migrations in a version-controlled, reproducible way
- Handle complex relationships (client → projects → tasks → comments)
- Generate TypeScript types automatically from the database schema
- Support connection pooling for production workloads
- Enable database seeding for development and demo environments
- Work with PostgreSQL-specific features (JSON columns, enums, full-text search)
- Scale to 30+ database models without schema management becoming unwieldy
- Integrate with our monorepo shared packages architecture

Raw SQL queries lack type safety. Other ORMs have weaker TypeScript support or less intuitive migration workflows.

---

## Decision

We will use **Prisma ORM** as the database access layer in `packages/database/`.

Key implementation choices:

- **Split schema files** — domain-specific `.prisma` files (`user.prisma`, `client.prisma`, `project.prisma`, etc.) composed via Prisma's import feature
- **Prisma Migrate** — version-controlled SQL migrations in `prisma/migrations/`
- **Generated client** — `PrismaClient` with full TypeScript types auto-generated from schema
- **Singleton client** — `packages/database/src/client.ts` prevents multiple instances during hot reload
- **Repository pattern** — backend modules access data only through repository files, never importing Prisma directly in services or controllers
- **Seed scripts** — `prisma/seed/` for development data (roles, demo users, sample clients)
- **Enums in `enums.prisma`** — centralized enum definitions referenced by domain schemas

---

## Consequences

### Positive

- **Type safety** — every query return type is inferred from the schema; compile-time errors for invalid fields
- **Auto-generated types** — `User`, `Client`, `Project` types available without manual definition
- **Migration workflow** — `prisma migrate dev` generates SQL migrations; `prisma migrate deploy` applies in production
- **Schema as documentation** — `.prisma` files serve as living data model documentation
- **Relationship handling** — `include`, `select`, and nested writes simplify complex queries
- **Prisma Studio** — visual database browser for development debugging
- **Monorepo integration** — `packages/database` consumed via workspace reference by `apps/api`

### Negative

- **Abstraction overhead** — complex queries may require raw SQL via `prisma.$queryRaw` for performance
- **Schema migration conflicts** — team members must coordinate migration generation to avoid conflicts
- **Bundle size** — Prisma Client is ~2 MB (mitigated by server-side only usage)
- **Vendor coupling** — deeply integrated with Prisma's schema language and migration format

### Neutral

- Prisma does not manage the PostgreSQL instance — Supabase handles hosting, backups, and connection pooling
- Connection string managed via `DATABASE_URL` environment variable

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Drizzle ORM** | Newer, smaller ecosystem; less mature migration tooling; fewer team members familiar |
| **TypeORM** | Decorator-based API; weaker TypeScript inference; migration issues reported at scale |
| **Knex.js (query builder)** | No auto-generated types; manual type definitions required; more boilerplate |
| **Raw SQL with `pg` driver** | No type safety; no migration management; error-prone at 30+ tables |
| **Sequelize** | Callback-era design; poor TypeScript support; declining community |
| **Supabase Client (direct)** | Bypasses ORM benefits; no migration management; tightly coupled to Supabase SDK |

---

## Why This Decision Is Best

Prisma is the leading TypeScript ORM with the best developer experience for PostgreSQL. For an enterprise application with **30+ models, complex relationships, and strict TypeScript requirements**, Prisma's auto-generated types eliminate an entire category of bugs — querying a field that doesn't exist, passing wrong types to database operations.

The split schema file approach (`user.prisma`, `client.prisma`, etc.) keeps the data model manageable as it grows. Prisma Migrate provides the version-controlled migration workflow required for production deployments.

Combined with our repository pattern (ADR-007), Prisma queries are isolated in repository files — services and controllers never touch the ORM directly. This means we could theoretically swap Prisma for another ORM by only changing repository files, protecting our business logic layer.
