# ADR-006: Why Feature-Based Architecture

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application contains 20+ distinct modules: Authentication, Dashboard, Clients, Projects, Tasks, Invoices, Reports, Calendar, AI Assistant, AI Documents, Notifications, File Manager, Settings, Team Management, and more. Each module has its own components, API calls, validation schemas, types, hooks, and potentially local state.

The application will be developed by multiple developers and maintained over years. Code organization must make it immediately obvious where any piece of logic lives and prevent cross-module coupling.

---

## Problem

We need a code organization strategy that can:

- Scale to 20+ modules without the codebase becoming unmaintainable
- Allow developers to work on one feature without breaking others
- Make it trivial to locate all code related to a specific domain (e.g., "everything about Clients")
- Prevent tight coupling between unrelated features
- Support parallel development by multiple team members
- Enable feature modules to be potentially extracted or disabled independently
- Mirror the same organizational pattern on both frontend and backend

Traditional layer-based organization (all components in one folder, all services in another, all hooks in another) causes files from unrelated features to be mixed together, making navigation and ownership unclear at scale.

---

## Decision

We will organize both frontend and backend code using **feature-based architecture** (also known as vertical slice architecture).

### Frontend (`apps/web/src/features/`)

Each feature is a self-contained module:

```
features/[feature-name]/
├── components/     # Feature-specific UI
├── hooks/          # TanStack Query hooks + custom hooks
├── services/       # API calls for this feature
├── stores/         # Feature-local Zustand store (if needed)
├── schemas/        # Zod validation schemas
├── types/          # TypeScript types
├── constants/      # Feature-specific constants
└── index.ts        # Public API barrel export
```

### Backend (`apps/api/src/modules/`)

Each module follows Clean Architecture layers:

```
modules/[module-name]/
├── [name].controller.ts
├── [name].service.ts
├── [name].repository.ts
├── [name].routes.ts
├── [name].validation.ts
├── [name].types.ts
└── index.ts
```

### Rules

- Features import from other features **only via `index.ts`** (public API)
- Shared/cross-cutting code lives in `components/`, `hooks/`, `services/`, `stores/` at the root level
- No feature imports another feature's internal files directly

---

## Consequences

### Positive

- **Discoverability** — all Client-related code is in `features/clients/`; no hunting across folders
- **Parallel development** — Developer A works on `features/invoices/` while Developer B works on `features/projects/`
- **Encapsulation** — `index.ts` barrel exports define the public contract; internals are private
- **Testability** — each feature can be tested in isolation
- **Onboarding** — new developers understand the structure immediately; every feature looks the same
- **Scalability** — adding module #21 follows the exact same template as module #1
- **Symmetry** — frontend `features/clients/` mirrors backend `modules/clients/`

### Negative

- **Duplication risk** — without discipline, similar utilities may be duplicated across features instead of extracted to shared
- **Cross-feature dependencies** — must be managed carefully via public APIs to avoid circular imports
- **Initial overhead** — each new feature requires creating the full folder structure

### Neutral

- Shared components, hooks, and utilities remain at the root level for cross-feature use
- Feature folders grow over time; periodic refactoring may be needed to extract shared logic

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Layer-based (by type)** | All components in one folder, all services in another — unmaintainable at 20+ modules; unrelated files mixed together |
| **Domain-Driven Design (DDD) bounded contexts** | Over-engineered for this project size; feature-based achieves similar benefits with less ceremony |
| **Micro-frontends** | Massive infrastructure overhead; premature for a single-team application |
| **Flat structure** | No organization; becomes chaotic beyond 5–10 files |
| **Page-based (Next.js default)** | Colocating logic in `app/` route folders couples routing to business logic; features must be separate from routes |

---

## Why This Decision Is Best

Feature-based architecture is the industry standard for large React and Node.js applications. For a project with **20+ modules spanning clients, projects, tasks, invoices, AI, and team management**, organizing by feature domain is the only approach that remains navigable as the codebase grows.

When a bug is reported in invoice PDF generation, the developer goes directly to `features/invoices/` (frontend) and `modules/invoices/` (backend). No searching through global `components/`, `services/`, and `hooks/` folders trying to find invoice-related files scattered among 20 other domains.

The `index.ts` public API pattern enforces encapsulation without the ceremony of DDD. Combined with our monorepo shared packages (ADR-016) and Clean Architecture layers (ADR-007), feature-based architecture provides the right balance of organization, scalability, and developer productivity.
