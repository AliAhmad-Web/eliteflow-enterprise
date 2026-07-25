# ADR-004: Why shadcn/ui

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application requires a comprehensive UI component library covering buttons, inputs, cards, tables, dropdowns, modals, drawers, sidebars, charts, pagination, alerts, toasts, loaders, and more — as defined in Phase 2 of the project plan. The core rule is: **one component built once, used everywhere across the entire project**.

The design reference (EliteFlow) demands a premium enterprise aesthetic with dark/light themes, glassmorphism, modern cards, and luxury typography. Components must be fully customizable to match this design without fighting library defaults.

---

## Problem

We need a component library that can:

- Provide all primitive UI components (button, input, table, dialog, etc.) out of the box
- Be fully customizable to match our premium enterprise design system
- Support dark and light themes natively
- Integrate with Tailwind CSS and our design tokens
- Not impose runtime dependencies or bundle bloat from a heavy external library
- Allow us to own the component source code for long-term maintenance
- Work with React Server Components in Next.js App Router
- Provide accessible components (ARIA, keyboard navigation) by default

Traditional component libraries (MUI, Ant Design, Chakra UI) ship as npm packages with their own styling systems, making customization to a premium custom design difficult and creating vendor lock-in.

---

## Decision

We will use **shadcn/ui** as our UI primitive component library, installed into `apps/web/src/components/ui/`.

Key implementation choices:

- **Copy-paste model** — shadcn components are added to our codebase, not installed as a dependency
- **Built on Radix UI** — accessible, unstyled primitives underneath
- **Styled with Tailwind CSS** — fully aligned with our styling decision (ADR-003)
- **Theme via CSS variables** — dark/light mode through `--background`, `--primary`, etc.
- **Components live in `components/ui/`** — never modified with business logic; only style overrides
- **Composite components** built in `components/common/` using `ui/` primitives
- **Feature components** built in `features/*/components/` using `common/` and `ui/` layers
- **No direct npm dependency** on shadcn — we own every line of component code

---

## Consequences

### Positive

- **Full ownership** — component source is in our repo; no breaking changes from library updates
- **Zero runtime cost** — no external component library bundle; only the code we use is shipped
- **Infinite customization** — every component can be restyled to match EliteFlow design exactly
- **Accessibility built-in** — Radix UI primitives handle ARIA, focus management, keyboard navigation
- **RSC compatible** — no `"use client"` forced on all components; only interactive primitives need it
- **Consistent API** — all shadcn components follow the same composition patterns (variants via `cva`)
- **Active ecosystem** — largest growing UI library in the React/Next.js community

### Negative

- **Manual updates** — new shadcn component versions must be manually copied/merged into our codebase
- **Initial setup** — each primitive must be individually added via CLI (`npx shadcn@latest add`)
- **No `<Button>` from npm** — developers must know components live in `@/components/ui/`, not `node_modules`
- **Customization responsibility** — we own bug fixes and accessibility maintenance for copied components

### Neutral

- Composite and feature components are our responsibility to build on top of primitives
- `components.json` tracks shadcn configuration and installed components

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Material UI (MUI)** | Heavy bundle (~300 KB); Material Design aesthetic conflicts with premium custom design; difficult to override |
| **Ant Design** | Enterprise-focused but opinionated design; poor customization for premium dark theme; large bundle |
| **Chakra UI** | CSS-in-JS runtime overhead; poor Server Component support; less active development |
| **Mantine** | Good library but external dependency; less control over component internals; CSS-in-JS |
| **Radix UI (direct)** | Unstyled primitives only; would require building every component from scratch — shadcn solves this |
| **Custom components from scratch** | Massive upfront effort for 30+ primitives; accessibility is hard to implement correctly |

---

## Why This Decision Is Best

shadcn/ui is the best choice because it gives us **the speed of a component library with the control of custom components**. For an enterprise application where the design must match a specific premium aesthetic (EliteFlow), owning the component source code is essential.

The copy-paste model means we are never blocked by a library's design decisions. Need a glassmorphism card variant? Edit `card.tsx` directly. Need a custom dark theme palette? Update CSS variables. No fighting `!important` overrides or theme API limitations.

Built on Radix UI primitives, we get enterprise-grade accessibility without writing ARIA attributes manually. Combined with Tailwind CSS (ADR-003) and our enterprise design system (ADR-017), shadcn/ui forms the foundation of a component architecture where every UI element is reusable, accessible, and fully under our control.
