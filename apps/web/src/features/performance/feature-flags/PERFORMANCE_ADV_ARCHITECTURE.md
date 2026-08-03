# Optimization Architecture (Phase 5 Phase 1)

**Status:** Design only. Do **not** implement ADV optimizations in Phase 1.  
**Principle:** Reuse Task 1.4 utilities, React Query, keep-alive, and feature flags. Every ADV control is independently gated.

---

## Layering

```
PERFORMANCE_* (Task 1.4)     → foundational opts already wired (default OFF)
PERFORMANCE_ADV_* (Phase 5)  → advanced opts (declared Phase 1; apply in Phase 2)
```

Do not duplicate `useStableCallback` / `maybeMemo` — extend call sites under ADV flags when measured.

---

## 1. Rendering & memoization

- Prefer stabilizing props (1.4 stable callbacks) before memoizing trees.  
- Progressive render (`PROGRESSIVE_RENDER`): shell chrome → deferred panels.  
- Avoid memoizing without profiler evidence.

## 2. Cache & query lifecycle

- Keep TanStack Query as source of truth (`QUERY_CACHE` only tunes).  
- No global library swap.  
- Respect persist allowlists; do not persist AI chat payloads by default.

## 3. Code splitting

- Prefer keep-alive loaders + `dynamic()` for heavy presentational islands (charts, settings sections, Team subpanes).  
- Gate with `CODE_SPLITTING`; do not break SSR metadata shells.

## 4. Route prefetching

- Extend `DashboardRouteWarmup` / PrefetchLink carefully (`ROUTE_OPTIMIZATION`).  
- Never reintroduce `preloadAllKeepAliveRoutes` stampede.

## 5. Image optimization

- Standardize on `next/image` where media is decorative/content (`IMAGE_OPTIMIZATION`).  
- Honor existing `remotePatterns`; no CDN product required in Phase 2.

## 6. Script loading

- Defer non-critical third parties; keep reCAPTCHA on auth paths only (`SCRIPT_LOADING`).

## 7. Virtualization

- Extend `@tanstack/react-virtual` patterns already used in CRM tables (`VIRTUALIZATION`).  
- Target AI lists, notifications, files, Team tables after measurement.

## 8. Streaming & progressive rendering

- Add Suspense boundaries with meaningful fallbacks on cold routes (`STREAMING` / `PROGRESSIVE_RENDER`).  
- Do not force RSC rewrite of interactive CRM.

## 9. Hydration

- Reduce client-only work above the fold; avoid layout thrash (`HYDRATION`).  
- Keep `suppressHydrationWarning` usage minimal and justified.

---

## Explicit non-goals (Phase 1)

- No virtual scrolling implementation  
- No RQ behavior changes  
- No image pipeline / CDN  
- No edge rendering / streaming code  
- No route or bundle production changes  

---

*Architecture document only.*
