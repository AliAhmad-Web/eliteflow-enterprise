# Soft Navigation / Instant Shell

**Date:** 2026-07-24  
**Goal:** Notion / Linear-style navigation — persistent chrome, keep-alive pages, no auth spinner on route change.

---

## Architecture

### Keep-alive outlet (`KeepAliveOutlet`)
- Static dashboard routes (Clients, Projects, Tasks, …) stay **mounted** after first visit.
- Inactive pages use `hidden` + `inert` + `content-visibility: hidden`.
- Scroll position restored per route on the main scroller.
- Dynamic routes (`/channels/[id]`, etc.) still use the normal Next.js page tree.

### Optimistic navigation (`PrefetchLink` + `nav-transition.store`)
- On click: set optimistic path **immediately** → KeepAlive swaps visible page.
- `router.push` runs in `startTransition` (URL/history catch up in background).
- Does **not** wait for RSC flight to show the next screen.

### Chunk + data warmup (`DashboardRouteWarmup`)
- After auth: idle-callback preloads all keep-alive feature modules.
- Prefetches Next.js routes + default list/stats queries for Clients/Projects/Tasks.

### Auth
- Bootstrap once per tab; guards never blank the shell when a session hint/cached user exists.

---

## Do not regress

- Do not put full-page loaders in `loading.tsx`.
- Do not remount KeepAlive pages on every navigation.
- Do not subscribe AuthGuard to `accessToken`.
- Do not wrap layout/sidebar/header in `next/dynamic`.

---

## Quick test

1. Login → wait ~2s for idle warmup.
2. Hover Clients then click → page should appear instantly.
3. Click Projects → Tasks → Clients again: filters/scroll should still be there.
4. No “Checking authentication” after the first load.
5. React Profiler: sidebar/header should not re-render as a full remount on nav.
