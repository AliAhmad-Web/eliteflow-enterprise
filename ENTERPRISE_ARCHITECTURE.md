# Enterprise Business Management Web Application
## Complete Folder Architecture

> **Version:** 1.0  
> **Architecture Style:** Monorepo · Feature-Based · Clean Architecture  
> **Status:** Architecture Blueprint (No Application Code)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Root Monorepo Structure](#2-root-monorepo-structure)
3. [Frontend Structure (Next.js)](#3-frontend-structure-nextjs)
4. [Backend Structure (Express)](#4-backend-structure-express)
5. [Shared Packages](#5-shared-packages)
6. [Database & Prisma](#6-database--prisma)
7. [Supabase Integration](#7-supabase-integration)
8. [Environment Configuration](#8-environment-configuration)
9. [Documentation](#9-documentation)
10. [Public Assets](#10-public-assets)
11. [Architecture Principles](#11-architecture-principles)
12. [Import Rules & Boundaries](#12-import-rules--boundaries)

---

## 1. Architecture Overview

This project uses a **monorepo** with clear separation between:

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Web App** | Next.js (App Router) | UI, routing, client state, SSR/SSG |
| **API Server** | Node.js + Express | Business logic, auth, data access |
| **Shared Packages** | TypeScript | Types, validation, constants shared across apps |
| **Database** | PostgreSQL + Prisma | Schema, migrations, ORM client |
| **Auth/Storage** | Supabase | Auth helpers, storage, realtime (where needed) |

```
enterprise-business-management/
├── apps/
│   ├── web/                          # Next.js Frontend
│   └── api/                          # Express Backend
├── packages/
│   ├── shared/                       # Cross-app shared code
│   ├── database/                     # Prisma schema & client
│   ├── config/                       # Environment schemas
│   └── tsconfig/                     # Shared TypeScript configs
├── docs/                             # Project documentation
├── docker/                           # Containerization
├── scripts/                          # Monorepo automation scripts
└── [root config files]
```

**Why Monorepo?**
- Single source of truth for types and validation
- Atomic changes across frontend and backend
- Shared tooling (ESLint, Prettier, TypeScript)
- Scales to multiple apps/services without duplication

---

## 2. Root Monorepo Structure

```
enterprise-business-management/
│
├── apps/
│   ├── web/                                    # Next.js Frontend Application
│   └── api/                                    # Express Backend Application
│
├── packages/
│   ├── shared/                                 # Shared types, schemas, constants
│   ├── database/                               # Prisma ORM package
│   ├── config/                                 # Environment validation (Zod)
│   └── tsconfig/                               # Base tsconfig presets
│
├── docs/
│   ├── architecture/                           # System design docs
│   ├── api/                                    # API reference
│   ├── database/                               # ERD, schema docs
│   ├── deployment/                             # Deploy guides
│   ├── development/                            # Dev setup, conventions
│   └── user-manual/                            # End-user documentation
│
├── docker/
│   ├── docker-compose.yml                      # Local dev stack (Postgres, Redis)
│   ├── docker-compose.prod.yml                 # Production compose
│   ├── Dockerfile.web                          # Next.js container
│   └── Dockerfile.api                          # Express container
│
├── scripts/
│   ├── setup.sh                                # First-time project setup
│   ├── seed.sh                                 # Database seeding
│   └── generate-types.sh                       # Type generation automation
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                              # Lint, type-check, test
│   │   ├── deploy-web.yml                      # Vercel / web deploy
│   │   └── deploy-api.yml                      # API deploy pipeline
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .env.example                                # Root env template (reference only)
├── .gitignore
├── .nvmrc                                      # Node version lock
├── package.json                                # Workspace root
├── pnpm-workspace.yaml                         # pnpm monorepo config
├── turbo.json                                  # Turborepo build orchestration
├── README.md
└── LICENSE
```

| Folder / File | Why It Exists |
|---------------|---------------|
| `apps/` | Hosts deployable applications. Keeps frontend and backend isolated but co-located. |
| `packages/` | Shared libraries consumed by multiple apps. Prevents code duplication. |
| `docs/` | Living documentation separate from code. Critical for enterprise onboarding. |
| `docker/` | Reproducible environments for dev, staging, and production. |
| `scripts/` | Automation for repetitive tasks (setup, seed, codegen). |
| `.github/workflows/` | CI/CD pipelines enforce quality gates before merge/deploy. |
| `turbo.json` | Caches and parallelizes builds across monorepo packages. |

---

## 3. Frontend Structure (Next.js)

```
apps/web/
│
├── public/
│   ├── images/
│   │   ├── logo/
│   │   ├── avatars/
│   │   ├── illustrations/
│   │   └── placeholders/
│   ├── icons/
│   ├── fonts/
│   ├── favicon.ico
│   ├── robots.txt
│   ├── sitemap.xml
│   └── manifest.json
│
├── src/
│   │
│   ├── app/                                    # Next.js App Router (Routes Only)
│   │   ├── (marketing)/                        # Public marketing pages
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   │
│   │   ├── (auth)/                             # Auth route group (no sidebar)
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx
│   │   │   ├── verify-email/
│   │   │   │   └── page.tsx
│   │   │   └── verify-otp/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/                        # Authenticated app shell
│   │   │   ├── layout.tsx                      # Sidebar + header layout
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [clientId]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [projectId]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [taskId]/
│   │   │   │       └── page.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [invoiceId]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── new/
│   │   │   │       └── page.tsx
│   │   │   ├── reports/
│   │   │   │   └── page.tsx
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx
│   │   │   ├── ai-assistant/
│   │   │   │   └── page.tsx
│   │   │   ├── ai-documents/
│   │   │   │   └── page.tsx
│   │   │   ├── notifications/
│   │   │   │   └── page.tsx
│   │   │   ├── file-manager/
│   │   │   │   └── page.tsx
│   │   │   ├── team/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx
│   │   │       ├── profile/
│   │   │       │   └── page.tsx
│   │   │       ├── company/
│   │   │       │   └── page.tsx
│   │   │       ├── appearance/
│   │   │       │   └── page.tsx
│   │   │       └── notifications/
│   │   │           └── page.tsx
│   │   │
│   │   ├── (admin)/                            # Super Admin / Admin only routes
│   │   │   ├── layout.tsx
│   │   │   ├── super-admin/
│   │   │   │   └── dashboard/
│   │   │   │       └── page.tsx
│   │   │   └── admin/
│   │   │       └── dashboard/
│   │   │           └── page.tsx
│   │   │
│   │   ├── (client-portal)/                    # Client role routes
│   │   │   ├── layout.tsx
│   │   │   └── portal/
│   │   │       └── dashboard/
│   │   │           └── page.tsx
│   │   │
│   │   ├── api/                                # Next.js Route Handlers (BFF only)
│   │   │   └── health/
│   │   │       └── route.ts
│   │   │
│   │   ├── error.tsx                           # Global error boundary
│   │   ├── not-found.tsx                       # 404 page
│   │   ├── loading.tsx                         # Global loading UI
│   │   ├── layout.tsx                          # Root layout
│   │   └── globals.css                         # Global styles entry
│   │
│   ├── components/                             # SHARED UI Components (Reusable)
│   │   │
│   │   ├── ui/                                 # shadcn/ui primitives (DO NOT MODIFY LOGIC)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── pagination.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/                             # App shell components
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── app-header.tsx
│   │   │   ├── app-footer.tsx
│   │   │   ├── right-panel.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   ├── breadcrumb-nav.tsx
│   │   │   └── page-header.tsx
│   │   │
│   │   ├── common/                             # Composite reusable components
│   │   │   ├── data-table/
│   │   │   │   ├── data-table.tsx
│   │   │   │   ├── data-table-toolbar.tsx
│   │   │   │   ├── data-table-pagination.tsx
│   │   │   │   ├── data-table-column-header.tsx
│   │   │   │   └── data-table-faceted-filter.tsx
│   │   │   ├── charts/
│   │   │   │   ├── area-chart.tsx
│   │   │   │   ├── bar-chart.tsx
│   │   │   │   ├── donut-chart.tsx
│   │   │   │   └── chart-container.tsx
│   │   │   ├── forms/
│   │   │   │   ├── form-field.tsx
│   │   │   │   ├── form-select.tsx
│   │   │   │   ├── form-date-picker.tsx
│   │   │   │   └── form-file-upload.tsx
│   │   │   ├── feedback/
│   │   │   │   ├── empty-state.tsx
│   │   │   │   ├── error-state.tsx
│   │   │   │   ├── loading-state.tsx
│   │   │   │   └── confirm-dialog.tsx
│   │   │   ├── display/
│   │   │   │   ├── stat-card.tsx
│   │   │   │   ├── status-badge.tsx
│   │   │   │   ├── user-avatar-group.tsx
│   │   │   │   ├── timeline.tsx
│   │   │   │   └── metric-trend.tsx
│   │   │   └── search/
│   │   │       ├── command-palette.tsx
│   │   │       └── global-search.tsx
│   │   │
│   │   └── providers/                          # React context providers
│   │       ├── app-providers.tsx               # Composes all providers
│   │       ├── theme-provider.tsx
│   │       ├── query-provider.tsx
│   │       ├── auth-provider.tsx
│   │       └── toast-provider.tsx
│   │
│   ├── features/                               # FEATURE-BASED MODULES (Core Logic)
│   │   │
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── login-form.tsx
│   │   │   │   ├── signup-form.tsx
│   │   │   │   ├── forgot-password-form.tsx
│   │   │   │   ├── reset-password-form.tsx
│   │   │   │   ├── otp-verification-form.tsx
│   │   │   │   └── social-login-buttons.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-login.ts
│   │   │   │   ├── use-signup.ts
│   │   │   │   ├── use-logout.ts
│   │   │   │   └── use-auth-session.ts
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   ├── stores/
│   │   │   │   └── auth.store.ts
│   │   │   ├── schemas/
│   │   │   │   ├── login.schema.ts
│   │   │   │   ├── signup.schema.ts
│   │   │   │   └── reset-password.schema.ts
│   │   │   ├── types/
│   │   │   │   └── auth.types.ts
│   │   │   ├── constants/
│   │   │   │   └── auth.constants.ts
│   │   │   └── index.ts                        # Public API barrel export
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── revenue-overview-chart.tsx
│   │   │   │   ├── project-status-chart.tsx
│   │   │   │   ├── recent-projects-list.tsx
│   │   │   │   ├── recent-invoices-list.tsx
│   │   │   │   ├── todays-tasks-widget.tsx
│   │   │   │   ├── mini-calendar-widget.tsx
│   │   │   │   └── dashboard-stats-grid.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-dashboard-stats.ts
│   │   │   │   └── use-revenue-chart.ts
│   │   │   ├── services/
│   │   │   │   └── dashboard.service.ts
│   │   │   ├── types/
│   │   │   │   └── dashboard.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── clients/
│   │   │   ├── components/
│   │   │   │   ├── client-list.tsx
│   │   │   │   ├── client-card.tsx
│   │   │   │   ├── client-form.tsx
│   │   │   │   ├── client-profile.tsx
│   │   │   │   ├── client-timeline.tsx
│   │   │   │   ├── client-notes.tsx
│   │   │   │   └── client-documents.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-clients.ts
│   │   │   │   ├── use-client.ts
│   │   │   │   ├── use-create-client.ts
│   │   │   │   ├── use-update-client.ts
│   │   │   │   └── use-delete-client.ts
│   │   │   ├── services/
│   │   │   │   └── clients.service.ts
│   │   │   ├── schemas/
│   │   │   │   └── client.schema.ts
│   │   │   ├── types/
│   │   │   │   └── client.types.ts
│   │   │   ├── constants/
│   │   │   │   └── client.constants.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── projects/
│   │   │   ├── components/
│   │   │   │   ├── project-list.tsx
│   │   │   │   ├── project-form.tsx
│   │   │   │   ├── project-kanban-board.tsx
│   │   │   │   ├── project-gantt-chart.tsx
│   │   │   │   ├── project-milestones.tsx
│   │   │   │   └── project-team-assign.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   └── index.ts
│   │   │
│   │   ├── tasks/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   └── index.ts
│   │   │
│   │   ├── invoices/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   └── index.ts
│   │   │
│   │   ├── reports/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── calendar/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── ai-assistant/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── ai-documents/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── file-manager/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── team/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   └── settings/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── schemas/
│   │       ├── types/
│   │       └── index.ts
│   │
│   ├── hooks/                                  # GLOBAL / CROSS-FEATURE HOOKS
│   │   ├── use-debounce.ts
│   │   ├── use-media-query.ts
│   │   ├── use-local-storage.ts
│   │   ├── use-permissions.ts
│   │   ├── use-role.ts
│   │   ├── use-toast.ts
│   │   └── use-mounted.ts
│   │
│   ├── services/                               # API CLIENT LAYER
│   │   ├── api/
│   │   │   ├── api-client.ts                   # Axios/fetch instance with interceptors
│   │   │   ├── api-error.ts                    # Normalized API error class
│   │   │   └── api-types.ts                    # Generic API response wrappers
│   │   └── supabase/
│   │       ├── supabase-client.ts              # Browser Supabase client
│   │       └── supabase-server.ts              # Server-side Supabase client
│   │
│   ├── stores/                                 # GLOBAL ZUSTAND STORES
│   │   ├── ui.store.ts                         # Sidebar state, modals, theme toggle
│   │   ├── notification.store.ts               # In-app notification state
│   │   └── index.ts
│   │
│   ├── types/                                  # GLOBAL FRONTEND TYPES
│   │   ├── global.d.ts
│   │   ├── navigation.types.ts
│   │   ├── pagination.types.ts
│   │   ├── api-response.types.ts
│   │   └── index.ts
│   │
│   ├── constants/                              # GLOBAL CONSTANTS
│   │   ├── routes.ts                           # Route path constants
│   │   ├── roles.ts                            # Role enum constants
│   │   ├── permissions.ts                      # Permission keys
│   │   ├── query-keys.ts                       # TanStack Query key factory
│   │   ├── api-endpoints.ts                    # API endpoint paths
│   │   └── index.ts
│   │
│   ├── utils/                                  # PURE UTILITY FUNCTIONS
│   │   ├── cn.ts                               # Tailwind class merge (clsx + twMerge)
│   │   ├── format-currency.ts
│   │   ├── format-date.ts
│   │   ├── format-file-size.ts
│   │   ├── truncate-text.ts
│   │   ├── generate-id.ts
│   │   └── index.ts
│   │
│   ├── lib/                                    # THIRD-PARTY CONFIG WRAPPERS
│   │   ├── react-query.ts                      # QueryClient config
│   │   ├── motion.ts                           # Framer Motion variants/presets
│   │   └── auth.ts                             # Next.js auth helpers
│   │
│   ├── styles/                                 # THEME & GLOBAL STYLES
│   │   ├── theme/
│   │   │   ├── colors.ts                       # Design token: colors
│   │   │   ├── typography.ts                   # Font sizes, weights, families
│   │   │   ├── spacing.ts                      # Spacing scale
│   │   │   ├── shadows.ts                      # Shadow tokens
│   │   │   ├── animations.ts                     # Animation presets
│   │   │   └── index.ts
│   │   └── globals/
│   │       ├── base.css
│   │       ├── components.css
│   │       └── utilities.css
│   │
│   ├── config/                                 # FRONTEND RUNTIME CONFIG
│   │   ├── site.config.ts                      # App name, description, URLs
│   │   ├── navigation.config.ts                # Sidebar nav items per role
│   │   └── env.ts                              # Validated client env vars
│   │
│   └── middleware.ts                           # Next.js middleware (auth, RBAC)
│
├── .env.local.example
├── components.json                             # shadcn/ui config
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── package.json
```

### Frontend Folder Explanations

| Folder | Why It Exists |
|--------|---------------|
| `app/` | **Routes only.** Pages import from `features/`. No business logic in route files. Route groups `(auth)`, `(dashboard)`, `(admin)` control layout without affecting URLs. |
| `components/ui/` | shadcn/ui primitives. Styled once, used everywhere. Never duplicated. |
| `components/layout/` | App shell (sidebar, header, footer). Shared across all dashboard pages. |
| `components/common/` | Composite reusable components (DataTable, StatCard, Charts). Built from `ui/` primitives. |
| `components/providers/` | React context composition. Single entry point for all providers. |
| `features/` | **Core of feature-based architecture.** Each module is self-contained with its own components, hooks, services, schemas, types. Teams can own a feature folder independently. |
| `features/*/index.ts` | Public API barrel. Other features import only from `index.ts`, never internal files. Enforces encapsulation. |
| `hooks/` | Global hooks used across multiple features (debounce, permissions, media query). Feature-specific hooks stay inside `features/*/hooks/`. |
| `services/api/` | HTTP client layer. All API calls go through here. Interceptors handle auth tokens, errors, retries. |
| `services/supabase/` | Supabase client initialization (browser vs server). |
| `stores/` | Global UI state only (sidebar open/close, theme). Server state lives in TanStack Query. Feature-specific stores go in `features/*/stores/`. |
| `types/` | Global TypeScript types not tied to a single feature. |
| `constants/` | Single source of truth for routes, roles, permissions, query keys. Prevents magic strings. |
| `utils/` | Pure functions with no side effects. Easily testable. |
| `lib/` | Third-party library configuration wrappers. |
| `styles/theme/` | Design tokens as TypeScript objects. Synced with Tailwind config. Enables programmatic theme access. |
| `config/` | Runtime configuration (nav items, site metadata). Separated from constants for clarity. |
| `middleware.ts` | Route protection, role-based redirects, token validation at the edge. |

### Feature Module Internal Structure (Template)

Every feature under `features/` follows this exact structure:

```
features/[feature-name]/
├── components/         # UI components specific to this feature
├── hooks/              # TanStack Query hooks + custom hooks
├── services/           # API calls for this feature
├── stores/             # Feature-local Zustand store (if needed)
├── schemas/            # Zod validation schemas
├── types/              # TypeScript interfaces/types
├── constants/          # Feature-specific constants
└── index.ts            # Public exports (barrel file)
```

**Why this template?**
- Predictable structure across 20+ modules
- New developers know exactly where to find/add code
- Features can be extracted to separate packages if needed
- Enforces Single Responsibility Principle

---

## 4. Backend Structure (Express)

```
apps/api/
│
├── src/
│   │
│   ├── server.ts                               # HTTP server bootstrap
│   ├── app.ts                                  # Express app configuration
│   │
│   ├── config/                                 # RUNTIME CONFIGURATION
│   │   ├── index.ts                            # Config aggregator
│   │   ├── database.config.ts
│   │   ├── auth.config.ts
│   │   ├── cors.config.ts
│   │   ├── rate-limit.config.ts
│   │   └── storage.config.ts
│   │
│   ├── modules/                                # FEATURE-BASED MODULES (Core)
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.controller.ts              # HTTP request handlers
│   │   │   ├── auth.service.ts                 # Business logic
│   │   │   ├── auth.repository.ts              # Database queries
│   │   │   ├── auth.routes.ts                  # Route definitions
│   │   │   ├── auth.validation.ts              # Zod request schemas
│   │   │   ├── auth.types.ts                   # Module-specific types
│   │   │   ├── auth.constants.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── users.validation.ts
│   │   │   ├── users.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── clients/
│   │   │   ├── clients.controller.ts
│   │   │   ├── clients.service.ts
│   │   │   ├── clients.repository.ts
│   │   │   ├── clients.routes.ts
│   │   │   ├── clients.validation.ts
│   │   │   ├── clients.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── projects/
│   │   │   ├── projects.controller.ts
│   │   │   ├── projects.service.ts
│   │   │   ├── projects.repository.ts
│   │   │   ├── projects.routes.ts
│   │   │   ├── projects.validation.ts
│   │   │   ├── projects.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── tasks/
│   │   │   └── [same structure]
│   │   │
│   │   ├── invoices/
│   │   │   └── [same structure]
│   │   │
│   │   ├── reports/
│   │   │   └── [same structure]
│   │   │
│   │   ├── calendar/
│   │   │   └── [same structure]
│   │   │
│   │   ├── notifications/
│   │   │   └── [same structure]
│   │   │
│   │   ├── files/
│   │   │   └── [same structure]
│   │   │
│   │   ├── team/
│   │   │   └── [same structure]
│   │   │
│   │   ├── settings/
│   │   │   └── [same structure]
│   │   │
│   │   ├── ai/
│   │   │   ├── ai.controller.ts
│   │   │   ├── ai.service.ts
│   │   │   ├── ai.routes.ts
│   │   │   ├── ai.validation.ts
│   │   │   ├── providers/
│   │   │   │   └── openai.provider.ts
│   │   │   └── index.ts
│   │   │
│   │   └── dashboard/
│   │       └── [same structure]
│   │
│   ├── middleware/                             # EXPRESS MIDDLEWARE
│   │   ├── auth.middleware.ts                  # JWT verification
│   │   ├── role.middleware.ts                  # RBAC enforcement
│   │   ├── permission.middleware.ts            # Granular permission checks
│   │   ├── validate.middleware.ts              # Zod request validation
│   │   ├── rate-limit.middleware.ts            # Rate limiting
│   │   ├── error.middleware.ts                 # Global error handler
│   │   ├── logger.middleware.ts                # Request logging
│   │   ├── cors.middleware.ts
│   │   └── upload.middleware.ts                # File upload (multer)
│   │
│   ├── routes/                                 # ROUTE AGGREGATOR
│   │   ├── index.ts                            # Mounts all module routes
│   │   └── health.routes.ts                    # Health check endpoint
│   │
│   ├── shared/                                 # BACKEND SHARED UTILITIES
│   │   ├── errors/
│   │   │   ├── app-error.ts                    # Base application error
│   │   │   ├── not-found.error.ts
│   │   │   ├── unauthorized.error.ts
│   │   │   ├── forbidden.error.ts
│   │   │   ├── validation.error.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── async-handler.ts                # Wraps async route handlers
│   │   │   ├── pagination.ts                   # Pagination helpers
│   │   │   ├── token.ts                        # JWT generate/verify
│   │   │   ├── password.ts                     # Hash/compare passwords
│   │   │   ├── file-validator.ts
│   │   │   └── logger.ts
│   │   ├── types/
│   │   │   ├── express.d.ts                    # Express request extensions
│   │   │   ├── pagination.types.ts
│   │   │   └── api-response.types.ts
│   │   └── constants/
│   │       ├── http-status.ts
│   │       ├── roles.ts
│   │       └── permissions.ts
│   │
│   ├── integrations/                           # THIRD-PARTY SERVICE ADAPTERS
│   │   ├── supabase/
│   │   │   ├── supabase.client.ts
│   │   │   └── supabase.storage.ts
│   │   ├── stripe/
│   │   │   └── stripe.client.ts
│   │   ├── openai/
│   │   │   └── openai.client.ts
│   │   ├── resend/
│   │   │   └── email.service.ts
│   │   ├── cloudinary/
│   │   │   └── cloudinary.client.ts
│   │   └── google/
│   │       ├── google-calendar.client.ts
│   │       └── google-auth.client.ts
│   │
│   └── jobs/                                   # BACKGROUND JOBS / CRON
│       ├── send-email.job.ts
│       ├── generate-report.job.ts
│       └── cleanup-files.job.ts
│
├── tests/
│   ├── unit/
│   │   ├── modules/
│   │   └── shared/
│   ├── integration/
│   │   └── modules/
│   └── setup.ts
│
├── .env.example
├── tsconfig.json
└── package.json
```

### Backend Module Internal Structure (Template)

Every module under `modules/` follows Clean Architecture layers:

```
modules/[module-name]/
├── [name].controller.ts    # Presentation Layer — HTTP in/out
├── [name].service.ts       # Business Logic Layer — rules, orchestration
├── [name].repository.ts    # Data Access Layer — Prisma queries only
├── [name].routes.ts        # Route definitions
├── [name].validation.ts    # Input validation (Zod schemas)
├── [name].types.ts         # Module types
├── [name].constants.ts     # Module constants (optional)
└── index.ts                # Public exports
```

| Layer | Responsibility | Rules |
|-------|---------------|-------|
| **Controller** | Parse request, call service, send response | No business logic. No direct DB access. |
| **Service** | Business rules, orchestration, transactions | No HTTP knowledge. Calls repository. |
| **Repository** | Database queries via Prisma | No business logic. Returns raw data. |
| **Validation** | Request body/query/params validation | Zod schemas shared with frontend via `packages/shared`. |
| **Routes** | HTTP method + path + middleware chain | Thin. Only wires controller to endpoints. |

### Backend Folder Explanations

| Folder | Why It Exists |
|--------|---------------|
| `config/` | Centralized configuration. Each config file owns one concern (DB, auth, CORS). |
| `modules/` | Feature-based backend modules. Mirrors frontend `features/` for symmetry. |
| `middleware/` | Cross-cutting concerns applied to routes (auth, validation, rate limiting). |
| `routes/index.ts` | Single entry point that mounts all module routes under `/api/v1/`. |
| `shared/errors/` | Custom error classes with HTTP status codes. Consistent error responses. |
| `shared/utils/` | Pure backend utilities (pagination, token, password hashing). |
| `integrations/` | Third-party service adapters. Isolates external API dependencies. Easy to swap providers. |
| `jobs/` | Background tasks (email sending, report generation). Separated from request cycle. |
| `tests/` | Unit tests for services/utils. Integration tests for API endpoints. |

---

## 5. Shared Packages

```
packages/
│
├── shared/                                     # CROSS-APP SHARED CODE
│   ├── src/
│   │   ├── types/
│   │   │   ├── user.types.ts
│   │   │   ├── client.types.ts
│   │   │   ├── project.types.ts
│   │   │   ├── task.types.ts
│   │   │   ├── invoice.types.ts
│   │   │   ├── notification.types.ts
│   │   │   ├── file.types.ts
│   │   │   ├── pagination.types.ts
│   │   │   ├── api-response.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── schemas/                            # ZOD VALIDATION (shared FE + BE)
│   │   │   ├── auth.schema.ts
│   │   │   ├── user.schema.ts
│   │   │   ├── client.schema.ts
│   │   │   ├── project.schema.ts
│   │   │   ├── task.schema.ts
│   │   │   ├── invoice.schema.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── constants/
│   │   │   ├── roles.ts                        # SUPER_ADMIN, ADMIN, EMPLOYEE, CLIENT
│   │   │   ├── permissions.ts                  # Permission keys
│   │   │   ├── status.ts                       # Status enums (project, task, invoice)
│   │   │   ├── regex.ts                        # Shared regex patterns
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── format-currency.ts
│   │   │   ├── format-date.ts
│   │   │   ├── slugify.ts
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts                            # Package entry point
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── config/                                     # ENVIRONMENT VALIDATION
│   ├── src/
│   │   ├── env.schema.ts                       # Master Zod env schema
│   │   ├── client.env.ts                       # NEXT_PUBLIC_* vars
│   │   ├── server.env.ts                       # Server-only vars
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── tsconfig/                                   # SHARED TS CONFIGS
    ├── base.json
    ├── nextjs.json
    ├── node.json
    └── package.json
```

| Package | Why It Exists |
|---------|---------------|
| `packages/shared` | **Single source of truth** for types, Zod schemas, constants, and utils used by both frontend and backend. Eliminates type drift. |
| `packages/shared/schemas/` | Zod schemas defined once, used for frontend form validation AND backend request validation. |
| `packages/config` | Environment variables validated at startup with Zod. Fails fast on missing/invalid config. |
| `packages/tsconfig` | Consistent TypeScript compiler settings across all packages. |

---

## 6. Database & Prisma

```
packages/database/
│
├── prisma/
│   ├── schema/
│   │   ├── schema.prisma                       # Main schema entry (imports others)
│   │   ├── user.prisma                         # User, Role, Permission models
│   │   ├── client.prisma                       # Client models
│   │   ├── project.prisma                      # Project, Milestone models
│   │   ├── task.prisma                         # Task, Comment, Label models
│   │   ├── invoice.prisma                      # Invoice, Payment models
│   │   ├── notification.prisma                 # Notification models
│   │   ├── file.prisma                         # File, Folder models
│   │   ├── calendar.prisma                     # Event, Reminder models
│   │   ├── team.prisma                         # Department, Attendance models
│   │   ├── audit.prisma                        # Audit log models
│   │   └── enums.prisma                        # All enum definitions
│   │
│   ├── migrations/                             # Auto-generated migration files
│   │   └── [timestamp]_init/
│   │       └── migration.sql
│   │
│   └── seed/
│       ├── seed.ts                             # Main seed runner
│       ├── users.seed.ts
│       ├── roles.seed.ts
│       └── demo-data.seed.ts
│
├── src/
│   ├── client.ts                               # Prisma client singleton
│   └── index.ts                                # Package exports
│
├── package.json
└── tsconfig.json
```

| Folder / File | Why It Exists |
|---------------|---------------|
| `prisma/schema/` | **Split schema files** by domain. Prevents one massive schema file as the app grows to 30+ models. |
| `schema.prisma` | Entry point that uses Prisma's `import` to compose domain schemas. |
| `enums.prisma` | All enums in one place. Referenced by domain schema files. |
| `migrations/` | Version-controlled database changes. Applied in order. |
| `seed/` | Development/demo data seeding. Separate files per domain. |
| `src/client.ts` | Singleton Prisma client. Prevents multiple instances in dev (hot reload). |

---

## 7. Supabase Integration

```
# Frontend (apps/web/src/services/supabase/)
supabase/
├── supabase-client.ts          # Browser client (createBrowserClient)
└── supabase-server.ts          # Server client (createServerClient)

# Backend (apps/api/src/integrations/supabase/)
supabase/
├── supabase.client.ts          # Service role client (admin operations)
└── supabase.storage.ts         # File upload/download helpers
```

| File | Why It Exists |
|------|---------------|
| `supabase-client.ts` (web) | Client-side Supabase for auth state, realtime subscriptions. |
| `supabase-server.ts` (web) | Server Components / Route Handlers that need Supabase access. |
| `supabase.client.ts` (api) | Service-role client for backend admin operations (bypass RLS). |
| `supabase.storage.ts` (api) | File storage operations abstracted from business logic. |

**Supabase Role in Architecture:**
- **Auth:** Social login (Google, GitHub), session management
- **Storage:** File uploads (documents, attachments, avatars)
- **Realtime:** Live notifications, chat (optional)
- **Primary DB:** PostgreSQL via Prisma (Supabase hosts the Postgres instance)

---

## 8. Environment Configuration

```
# Root
.env.example                    # Documents ALL env vars (no secrets)

# Frontend
apps/web/.env.local.example     # NEXT_PUBLIC_* vars only

# Backend
apps/api/.env.example           # Server secrets (JWT, DB, API keys)

# Validation
packages/config/src/
├── env.schema.ts               # Master schema
├── client.env.ts               # Client-safe vars
└── server.env.ts               # Server-only vars
```

### Environment Variables Map

| Variable | App | Purpose |
|----------|-----|---------|
| `NEXT_PUBLIC_API_URL` | Web | Backend API base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Web | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web | Supabase anonymous key |
| `NEXT_PUBLIC_APP_URL` | Web | Frontend URL |
| `DATABASE_URL` | API | PostgreSQL connection string |
| `JWT_SECRET` | API | Access token signing key |
| `JWT_REFRESH_SECRET` | API | Refresh token signing key |
| `SUPABASE_SERVICE_ROLE_KEY` | API | Supabase admin key |
| `OPENAI_API_KEY` | API | AI features |
| `STRIPE_SECRET_KEY` | API | Payment processing |
| `RESEND_API_KEY` | API | Email sending |
| `CLOUDINARY_*` | API | Media storage |
| `GOOGLE_CLIENT_*` | API | Google OAuth / Calendar |

**Why separate env files?**
- Frontend only gets `NEXT_PUBLIC_*` vars (exposed to browser)
- Backend gets all secrets
- Zod validation at startup prevents runtime crashes from missing config

---

## 9. Documentation

```
docs/
│
├── architecture/
│   ├── overview.md                             # System architecture diagram
│   ├── folder-structure.md                     # This document
│   ├── data-flow.md                            # Request lifecycle
│   ├── auth-flow.md                            # Authentication sequence
│   └── decisions/                              # Architecture Decision Records (ADRs)
│       ├── 001-monorepo.md
│       ├── 002-feature-based-structure.md
│       └── 003-state-management.md
│
├── api/
│   ├── README.md                               # API overview
│   ├── authentication.md                       # Auth endpoints
│   ├── clients.md
│   ├── projects.md
│   └── errors.md                               # Error response format
│
├── database/
│   ├── erd.md                                  # Entity Relationship Diagram
│   ├── schema.md                               # Table descriptions
│   └── migrations.md                           # Migration guide
│
├── deployment/
│   ├── local-setup.md                          # Dev environment setup
│   ├── staging.md
│   ├── production.md
│   ├── vercel.md                               # Frontend deployment
│   └── docker.md                               # Container deployment
│
├── development/
│   ├── getting-started.md                      # First-time setup guide
│   ├── coding-standards.md                     # Code style rules
│   ├── naming-conventions.md                   # File/folder/variable naming
│   ├── component-guidelines.md                 # How to create reusable components
│   ├── git-workflow.md                         # Branching strategy
│   └── testing-guide.md                        # How to write tests
│
└── user-manual/
    ├── admin-guide.md
    ├── employee-guide.md
    └── client-guide.md
```

---

## 10. Public Assets

```
apps/web/public/
│
├── images/
│   ├── logo/
│   │   ├── logo.svg                            # Primary logo
│   │   ├── logo-dark.svg                       # Dark mode variant
│   │   ├── logo-icon.svg                       # Favicon / small icon
│   │   └── logo-full.svg                       # Full wordmark
│   ├── avatars/
│   │   └── default-avatar.png
│   ├── illustrations/
│   │   ├── empty-state.svg
│   │   ├── error-404.svg
│   │   └── welcome.svg
│   └── placeholders/
│       └── image-placeholder.png
│
├── icons/
│   └── app-icon-192.png                        # PWA icon
│
├── fonts/                                      # Self-hosted fonts (if not using next/font)
│
├── favicon.ico
├── robots.txt
├── sitemap.xml
└── manifest.json                               # PWA manifest
```

---

## 11. Architecture Principles

### Clean Architecture Layers

```
┌─────────────────────────────────────────────┐
│              PRESENTATION                  │
│   Next.js Pages · Express Controllers      │
│   Components · Route Handlers              │
├─────────────────────────────────────────────┤
│              APPLICATION                   │
│   Services · Hooks · Stores                │
│   Business Logic · Orchestration           │
├─────────────────────────────────────────────┤
│              DOMAIN                        │
│   Types · Schemas · Constants              │
│   Shared Package · Validation Rules        │
├─────────────────────────────────────────────┤
│              INFRASTRUCTURE                │
│   Prisma · Supabase · Stripe · OpenAI      │
│   Repositories · Integrations · Jobs       │
└─────────────────────────────────────────────┘
```

**Dependency Rule:** Outer layers depend on inner layers. Inner layers never depend on outer layers.

### SOLID Applied

| Principle | How We Apply It |
|-----------|----------------|
| **S** — Single Responsibility | Each file has one job. Controller handles HTTP, Service handles logic, Repository handles DB. |
| **O** — Open/Closed | Features extend via new modules without modifying existing ones. |
| **L** — Liskov Substitution | Service interfaces allow swapping implementations (e.g., email providers). |
| **I** — Interface Segregation | Feature `index.ts` exports only what's needed. Internal files are private. |
| **D** — Dependency Inversion | Services depend on repository interfaces, not Prisma directly. Integrations are injected. |

### State Management Strategy

| State Type | Tool | Location |
|-----------|------|----------|
| **Server State** | TanStack Query | `features/*/hooks/` |
| **Global UI State** | Zustand | `stores/` |
| **Feature UI State** | Zustand | `features/*/stores/` |
| **Form State** | React Hook Form | Inside form components |
| **URL State** | Next.js searchParams | Route pages |

### Component Reusability Rule

```
ui/ (shadcn primitives)
  └── common/ (composite components built from ui/)
       └── features/*/components/ (feature-specific, built from common/ + ui/)
```

**Rule:** A component is built ONCE in `components/` and reused everywhere. Feature components compose from shared components, never duplicate them.

---

## 12. Import Rules & Boundaries

### Allowed Import Directions

```
✅ features/auth → components/ui
✅ features/auth → components/common
✅ features/auth → hooks/ (global)
✅ features/auth → services/api
✅ features/auth → packages/shared
✅ features/clients → features/auth (via index.ts only)

❌ components/ui → features/*
❌ components/common → features/*
❌ packages/shared → apps/*
❌ features/clients → features/clients/internal-file (use index.ts)
❌ apps/api → apps/web
❌ apps/web → apps/api (use HTTP API)
```

### Import Alias Configuration

```json
// tsconfig paths
{
  "@/components/*": ["src/components/*"],
  "@/features/*": ["src/features/*"],
  "@/hooks/*": ["src/hooks/*"],
  "@/services/*": ["src/services/*"],
  "@/stores/*": ["src/stores/*"],
  "@/types/*": ["src/types/*"],
  "@/constants/*": ["src/constants/*"],
  "@/utils/*": ["src/utils/*"],
  "@/lib/*": ["src/lib/*"],
  "@/styles/*": ["src/styles/*"],
  "@/config/*": ["src/config/*"],
  "@shared/*": ["../../packages/shared/src/*"],
  "@database/*": ["../../packages/database/src/*"]
}
```

---

## Summary

| Area | Location | Pattern |
|------|----------|---------|
| Routes | `apps/web/src/app/` | Next.js App Router with route groups |
| UI Primitives | `apps/web/src/components/ui/` | shadcn/ui (build once) |
| Shared Components | `apps/web/src/components/common/` | Composite reusables |
| Feature Logic | `apps/web/src/features/` | Self-contained modules |
| API Client | `apps/web/src/services/api/` | HTTP layer with interceptors |
| Global State | `apps/web/src/stores/` | Zustand (UI state only) |
| Server State | `features/*/hooks/` | TanStack Query |
| Backend Modules | `apps/api/src/modules/` | Controller → Service → Repository |
| Middleware | `apps/api/src/middleware/` | Cross-cutting concerns |
| Integrations | `apps/api/src/integrations/` | Third-party adapters |
| Shared Types/Schemas | `packages/shared/` | Used by FE + BE |
| Database | `packages/database/` | Prisma with split schemas |
| Env Validation | `packages/config/` | Zod-validated at startup |
| Documentation | `docs/` | Architecture, API, deployment |

This architecture supports **20+ modules**, **4 user roles**, and **years of scaling** without structural refactoring.
