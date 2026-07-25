# ADR-011: Why Zustand

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application frontend manages two distinct categories of state: **server state** (data from the API — clients, projects, invoices) and **client/UI state** (sidebar collapsed, active theme, open modals, notification panel visibility). These require different tools with different lifecycles.

Server state is handled by TanStack Query (ADR-010). UI state needs a lightweight, synchronous store that multiple components can read and write without prop drilling or unnecessary re-renders.

---

## Problem

We need a client state management solution that can:

- Manage global UI state (sidebar open/close, theme mode, active modal)
- Support feature-local state where needed (notification panel, command palette)
- Avoid boilerplate — no actions, reducers, or providers for simple state
- Minimize re-renders — components subscribe only to the state slices they use
- Work with TypeScript for type-safe state and actions
- Integrate with React without wrapping the entire app in complex provider trees
- Not compete with TanStack Query for server state management
- Have a minimal bundle size impact

Redux is over-engineered for UI state. React Context causes re-renders on every state change. Local `useState` doesn't scale for state shared across distant components (sidebar state needed in layout, header, and mobile nav).

---

## Decision

We will use **Zustand** for all client-side UI state management.

Key implementation choices:

- **Global stores in `apps/web/src/stores/`** — UI state shared across the entire app
- **Feature stores in `features/*/stores/`** — state scoped to a specific feature (if needed)
- **No server state in Zustand** — API data lives exclusively in TanStack Query
- **No providers required** — Zustand stores work without wrapping components in context providers
- **TypeScript-first** — stores defined with typed state and actions

### Global stores:

| Store | State | Location |
|-------|-------|----------|
| `ui.store.ts` | Sidebar collapsed, mobile nav open, command palette open | `stores/` |
| `notification.store.ts` | Unread count, panel visibility | `stores/` |

### Feature stores (when needed):

| Store | State | Location |
|-------|-------|----------|
| `auth.store.ts` | Current user session, role | `features/auth/stores/` |

### Rules:

- If state comes from the API → TanStack Query
- If state is UI-only and global → Zustand in `stores/`
- If state is UI-only and feature-scoped → Zustand in `features/*/stores/`
- If state is form input → React Hook Form (ADR-012)
- If state is URL-based → Next.js `searchParams`

---

## Consequences

### Positive

- **Minimal API** — `create()` with state and actions; no boilerplate
- **No providers** — import and use the store directly in any component
- **Selective subscriptions** — `useStore(state => state.sidebarOpen)` re-renders only when that slice changes
- **Tiny bundle** — ~1 KB gzipped
- **TypeScript native** — full type inference for state and actions
- **DevTools** — Zustand DevTools middleware for debugging
- **No async logic** — Zustand stores are synchronous; async belongs in TanStack Query

### Negative

- **No built-in devtools** — requires middleware setup (minor)
- **Less structure** — no enforced patterns like Redux's actions/reducers; discipline required
- **Testing** — stores are module-level singletons; tests must reset state between runs

### Neutral

- Zustand and TanStack Query coexist without conflict — clear ownership boundaries
- Most features won't need a Zustand store; TanStack Query handles the majority of state

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Redux Toolkit** | Massive overkill for UI state; requires providers, slices, actions; ~15 KB bundle |
| **React Context + useReducer** | Re-renders all consumers on any state change; provider nesting hell |
| **Jotai** | Atomic model adds complexity; Zustand's store model is simpler for our use case |
| **Valtio** | Proxy-based reactivity; less predictable than Zustand's explicit subscriptions |
| **TanStack Query for everything** | Wrong tool for synchronous UI state; no support for sidebar/modal state |
| **Local useState only** | Prop drilling for sidebar, theme, and notification state across layout components |

---

## Why This Decision Is Best

Zustand is the optimal choice for UI state because it solves the exact problem we have — **a few pieces of global UI state shared across layout components** — with virtually zero overhead.

Our application has perhaps 3–5 global UI state concerns (sidebar, theme, notifications, command palette). Redux would require actions, reducers, selectors, and a provider for this. Zustand requires a 15-line store file.

The critical architectural decision is the **separation of concerns**: TanStack Query owns server state, Zustand owns UI state, React Hook Form owns form state. This prevents the common anti-pattern of a single global store that becomes a dumping ground for everything. Each state management tool does one job exceptionally well.
