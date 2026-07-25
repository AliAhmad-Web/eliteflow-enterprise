# ADR-017: Why Enterprise Design System

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application targets enterprise users — business owners, administrators, employees, and clients — who expect a premium, professional interface. The design reference (EliteFlow) establishes a dark-themed, glassmorphism-rich dashboard with luxury typography, modern cards, smooth animations, and a cohesive color palette.

The project plan (Phase 2) explicitly requires: premium dark/light themes, reusable components, consistent spacing, professional color palette, loading skeletons, empty states, error states, hover effects, and the rule that **one component is built once and used everywhere**.

With 20+ modules and multiple developers, inconsistent UI leads to a fragmented, unprofessional product.

---

## Problem

We need a design system that can:

- Enforce visual consistency across 20+ feature modules built by different developers
- Support premium dark and light themes with seamless switching
- Provide pre-built components for every UI pattern (buttons, inputs, tables, modals, charts, etc.)
- Define design tokens (colors, typography, spacing, shadows, animations) as a single source of truth
- Prevent component duplication — the same button, card, or table used everywhere
- Support responsive design across desktop, laptop, tablet, and mobile
- Enable rapid feature development without design decisions per screen
- Match the EliteFlow design reference aesthetic
- Scale as new modules are added without visual drift

Without a design system, each developer makes independent styling choices — different border radii, inconsistent spacing, mismatched colors — resulting in an unprofessional product.

---

## Decision

We will implement an **Enterprise Design System** built on our component architecture layers, design tokens, and theme system.

### Component hierarchy:

```
Layer 1: ui/ (shadcn/ui primitives)
  └── Button, Input, Card, Table, Dialog, Badge, Avatar...

Layer 2: common/ (composite reusable components)
  └── DataTable, StatCard, StatusBadge, AreaChart, EmptyState, FormField...

Layer 3: features/*/components/ (feature-specific)
  └── ClientList, InvoiceForm, ProjectKanban...
  (built from Layer 1 + Layer 2 only)
```

### Design tokens (`src/styles/theme/`):

| Token Category | File | Examples |
|---------------|------|---------|
| **Colors** | `colors.ts` | primary, secondary, accent, destructive, muted, background, foreground |
| **Typography** | `typography.ts` | font families, sizes (xs–4xl), weights, line heights |
| **Spacing** | `spacing.ts` | 4px base scale (1, 2, 3, 4, 6, 8, 12, 16, 24) |
| **Shadows** | `shadows.ts` | sm, md, lg, glow (purple accent glow) |
| **Animations** | `animations.ts` | fadeIn, slideUp, pulse, skeleton shimmer |

### Theme system:

- **CSS variables** in `globals.css` define all color tokens
- **Tailwind config** references CSS variables for utility classes
- **Dark theme** (default) — deep charcoal background, purple accents, gold branding
- **Light theme** — clean white background, same accent palette
- **Theme toggle** in header — persisted in localStorage via Zustand
- **`theme-provider.tsx`** — applies `dark`/`light` class to `<html>`

### Required UI states (every data view):

| State | Component | Usage |
|-------|-----------|-------|
| **Loading** | `Skeleton` / `LoadingState` | Data fetching in progress |
| **Empty** | `EmptyState` | No data exists yet |
| **Error** | `ErrorState` | API call failed |
| **Success** | Normal content | Data loaded successfully |

### Rules:

1. **Never duplicate a component** — if `StatCard` exists in `common/`, use it; do not create `DashboardStatCard`
2. **Never style outside the design system** — no arbitrary colors, spacing, or font sizes
3. **Always handle all four UI states** — loading, empty, error, success
4. **Feature components compose from common + ui** — never from raw HTML + Tailwind

---

## Consequences

### Positive

- **Visual consistency** — every page looks like part of the same product
- **Development speed** — new features assembled from existing components, not styled from scratch
- **Premium aesthetic** — design tokens enforce the EliteFlow look automatically
- **Theme support** — dark/light mode works everywhere without per-component changes
- **Maintainability** — change `StatCard` once, all 20+ modules update
- **Onboarding** — new developers use the component library, not invent UI
- **Accessibility** — shadcn/ui primitives provide ARIA compliance by default

### Negative

- **Upfront investment** — building the full component library before features takes time
- **Rigidity** — developers cannot freely style; must work within the design system
- **Migration cost** — if design changes, all components must be updated (mitigated by token system)
- **Documentation needed** — component usage guidelines must be maintained

### Neutral

- Design tokens in TypeScript mirror Tailwind config — both must be kept in sync
- Storybook or similar component documentation may be added later

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **No design system (ad-hoc styling)** | Visual inconsistency across 20+ modules; unprofessional result; duplicated components |
| **External design system (MUI, Ant)** | Cannot achieve EliteFlow custom aesthetic; vendor lock-in; heavy bundle |
| **Figma-only (no code tokens)** | Design-code drift; manual translation; no programmatic theme access |
| **CSS framework only (Bootstrap)** | Not compatible with React component model; cannot enforce component reuse |
| **Per-feature styling** | Each module looks different; "one component once" rule violated |

---

## Why This Decision Is Best

An enterprise design system is not a luxury — it is a requirement for a product with **20+ modules, four user roles, and a premium positioning**. The EliteFlow design reference sets a high bar that cannot be achieved with ad-hoc styling.

The three-layer component hierarchy (ui → common → features) enforces the project's core rule: build once, use everywhere. When the dashboard needs a stat card, it uses `StatCard` from `common/`. When clients page needs a stat card, it uses the same `StatCard`. When invoices page needs one, same component. One place to update, one place to fix bugs, one consistent look.

Design tokens make theme changes trivial — update `--primary` in CSS variables, and every button, badge, and accent across the entire application updates. For a product expected to evolve over years, this token-based approach prevents the visual debt that kills enterprise applications.
