# ADR-001: Why Next.js App Router

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application is a large-scale, multi-role platform with 20+ modules including dashboards, client management, invoicing, AI features, and file management. The frontend must support server-side rendering, role-based routing, SEO for public pages, and a premium enterprise UI with fast navigation between complex views.

The application requires a modern React framework that can scale with the product roadmap, support team collaboration, and integrate cleanly with our Express API backend and Supabase services.

---

## Problem

We need a frontend framework that can:

- Handle complex routing for four distinct user roles (Super Admin, Admin, Employee, Client)
- Support server-side rendering and static generation where appropriate
- Provide layout composition for shared shells (sidebar, header, dashboard layout)
- Enable middleware-based authentication and authorization at the edge
- Scale to 20+ feature modules without routing complexity
- Deliver production-grade performance for enterprise users
- Maintain a strong ecosystem and long-term vendor support

Using a client-only SPA would increase initial load times, complicate SEO for public pages, and push all auth logic to the client. Using an older routing paradigm would limit layout composition and streaming capabilities.

---

## Decision

We will use **Next.js (latest version) with the App Router** as the frontend framework for `apps/web`.

Key implementation choices:

- **App Router** (`src/app/`) for all routing — not the legacy Pages Router
- **Route groups** `(auth)`, `(dashboard)`, `(admin)`, `(client-portal)` for layout composition without URL pollution
- **Server Components** by default; Client Components only where interactivity is required
- **Next.js Middleware** (`middleware.ts`) for auth checks and role-based redirects
- **Route Handlers** used sparingly for BFF/health endpoints only — primary API logic stays in Express
- **Deployment** on Vercel for optimized Next.js hosting

---

## Consequences

### Positive

- **Layout composition** — nested layouts (root → dashboard → feature) without prop drilling
- **Performance** — Server Components reduce client-side JavaScript bundle size
- **Streaming** — progressive page loading with Suspense boundaries improves perceived performance
- **Middleware** — auth and RBAC checks run before page render, improving security
- **Route groups** — clean separation of auth, dashboard, admin, and client portal layouts
- **Ecosystem** — largest React framework community, extensive documentation, Vercel optimization
- **Future-proof** — App Router is the official direction of Next.js; Pages Router is in maintenance mode

### Negative

- **Learning curve** — Server vs Client Component boundaries require team discipline
- **Caching complexity** — Next.js caching model (fetch cache, router cache) requires explicit configuration
- **Vendor coupling** — tight integration with Vercel for optimal deployment experience
- **Debugging** — server/client boundary errors can be harder to trace for developers new to RSC

### Neutral

- Express backend remains the primary API layer; Next.js is not used as a full-stack replacement
- Some third-party libraries may require `"use client"` wrappers

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Next.js Pages Router** | Legacy paradigm; no Server Components, limited layout nesting, not the strategic direction of Next.js |
| **Create React App (CRA)** | Deprecated by React team; no SSR, no file-based routing, no built-in optimization |
| **Vite + React Router** | Excellent DX but requires manual SSR setup, no built-in middleware, more infrastructure to maintain |
| **Remix** | Strong framework but smaller ecosystem; less alignment with Vercel deployment and team familiarity |
| **Angular** | Steeper learning curve; smaller React-aligned talent pool; incompatible with our React component strategy |
| **Nuxt.js (Vue)** | Team and ecosystem aligned on React; would require different component libraries and hiring profile |

---

## Why This Decision Is Best

Next.js App Router is the optimal choice for an enterprise application of this scale because it provides **layout composition, server rendering, and middleware-based security** out of the box — three requirements that would otherwise require significant custom infrastructure.

For a 20+ module application with four role-based dashboards, route groups and nested layouts eliminate routing spaghetti. Server Components keep dashboard pages fast by rendering data-heavy views on the server. Middleware enforces auth before any page logic executes.

The App Router is the current and future standard for Next.js. Choosing it now avoids a costly migration from Pages Router later. Combined with Vercel deployment, TypeScript, and our feature-based folder structure, it forms a production-ready frontend foundation that can scale for years.
