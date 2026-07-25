# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records for the **Enterprise Business Management Web Application**.

ADRs document significant technical decisions, the context behind them, alternatives considered, and their consequences. They serve as a historical record for current and future team members.

---

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](./ADR-001-nextjs-app-router.md) | Why Next.js App Router | Accepted |
| [ADR-002](./ADR-002-typescript.md) | Why TypeScript | Accepted |
| [ADR-003](./ADR-003-tailwind-css.md) | Why Tailwind CSS | Accepted |
| [ADR-004](./ADR-004-shadcn-ui.md) | Why shadcn/ui | Accepted |
| [ADR-005](./ADR-005-monorepo-architecture.md) | Why Monorepo Architecture | Accepted |
| [ADR-006](./ADR-006-feature-based-architecture.md) | Why Feature-Based Architecture | Accepted |
| [ADR-007](./ADR-007-clean-architecture.md) | Why Clean Architecture | Accepted |
| [ADR-008](./ADR-008-prisma-orm.md) | Why Prisma ORM | Accepted |
| [ADR-009](./ADR-009-postgresql-supabase.md) | Why PostgreSQL (Supabase) | Accepted |
| [ADR-010](./ADR-010-tanstack-query.md) | Why TanStack Query | Accepted |
| [ADR-011](./ADR-011-zustand.md) | Why Zustand | Accepted |
| [ADR-012](./ADR-012-react-hook-form.md) | Why React Hook Form | Accepted |
| [ADR-013](./ADR-013-zod-validation.md) | Why Zod Validation | Accepted |
| [ADR-014](./ADR-014-jwt-refresh-tokens.md) | Why JWT + Refresh Tokens | Accepted |
| [ADR-015](./ADR-015-role-based-access-control.md) | Why Role-Based Access Control (RBAC) | Accepted |
| [ADR-016](./ADR-016-shared-packages.md) | Why Shared Packages | Accepted |
| [ADR-017](./ADR-017-enterprise-design-system.md) | Why Enterprise Design System | Accepted |
| [ADR-018](./ADR-018-api-versioning.md) | Why API Versioning | Accepted |
| [ADR-019](./ADR-019-environment-validation.md) | Why Environment Validation | Accepted |
| [ADR-020](./ADR-020-logging-audit-logs.md) | Why Logging & Audit Logs | Accepted |

---

## ADR Template

When creating new ADRs, use the following structure:

```markdown
# ADR-XXX: Title

**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Deciders:** Architecture Team

## Context
## Problem
## Decision
## Consequences
## Alternatives Considered
## Why This Decision Is Best
```

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| **Proposed** | Under discussion, not yet approved |
| **Accepted** | Approved and actively implemented |
| **Deprecated** | No longer recommended, but may still exist in codebase |
| **Superseded** | Replaced by a newer ADR |

---

## Related Documentation

- [Enterprise Folder Architecture](../../ENTERPRISE_ARCHITECTURE.md)
- [Project Plan](../../PROJECT_PLAN.md)
