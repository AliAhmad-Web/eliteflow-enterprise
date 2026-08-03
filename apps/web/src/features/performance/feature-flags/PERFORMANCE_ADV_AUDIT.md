# Enterprise Performance Audit — Advanced (Phase 5 Phase 1)

**Scope:** Findings only. No production optimizations in this phase.  
**Builds on:** Task 1.4 `PERFORMANCE_*` foundation + Phase 2 opt-in wiring.

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| React render performance | Mixed | Orchestrators memoized behind 1.4 flags; Team monolith remains |
| React Query | Strong baseline | Persist + conservative refetch; AI/Reports list staleTime helpers |
| Memoization | Partial | Assistant / Documents / Reports when 1.4 flags ON |
| Bundle composition | Good start | optimizePackageImports; charts lazy behind 1.4 flag; analyze stub |
| Dynamic imports | Partial | Keep-alive lazy; unused `lazy-feature-pages` fallbacks |
| Route transitions | Strong | Keep-alive + PrefetchLink; idle warm gated |
| Hydration | Typical App Router | Thin RSC pages → large client trees |
| Suspense | Sparse | Auth/settings strong; most dashboard routes weak |
| Server vs Client | Client-heavy | Expected for CRM/AI interactivity |
| Streaming | Minimal | No progressive RSC streaming strategy yet |
| Large lists | Mixed | CRM tables virtualized; AI/files/team/notifications often not |
| Charts | Light | Custom SVG; optional lazy gate |
| AI / Docs / Reports | Instrumented | Render profiler + memo paths exist (flagged) |
| Dashboard | Thin shell | Heavy widgets still client |
| Network duplication | Mitigated | RQ defaults + persist; watch invalidation storms |
| Cache strategy | Good | Allowlisted localStorage persist |
| Lazy loading | Present | Keep-alive loaders |
| Asset loading | Basic | next/image remotePatterns; no ADV image pipeline |

---

## 1. React render performance

- `useRenderProfiler` on AI Assistant, Documents, Reports (dev + `PERFORMANCE_RENDER_PROFILING`).
- Stable callbacks / shell memo when 1.4 flags ON.
- **Gap:** Team page (~2.5k lines) and other CRM shells lack ADV profiling coverage.
- **Phase 2:** `PERFORMANCE_ADV_PROGRESSIVE_RENDER`, broader profiling via `WEB_VITALS` / existing render profiler.

---

## 2. React Query

- Defaults: 5m stale / 60m gc, no focus refetch, `keepPreviousData`, persist allowlist.
- 1.4 `QUERY_TUNING` overlay: 10m/90m when ON.
- **Gap:** CRM list hooks may not all use list staleTime helpers; AI keys excluded from persist (intentional).
- **Phase 2:** `PERFORMANCE_ADV_QUERY_CACHE` — extend lifecycle without replacing RQ.

---

## 3. Memoization

- Presentational `maybeMemo` + orchestrator `usePerformanceMemo` behind 1.4 flags.
- **Gap:** Indiscriminate memo risk if expanded without measurement.
- Reuse 1.4 utilities; ADV phase should measure before widening.

---

## 4. Bundle / dynamic imports / code splitting

- `optimizePackageImports` for lucide/framer.
- Reports charts gate behind `PERFORMANCE_BUNDLE_OPTIMIZATION`.
- Keep-alive `React.lazy` for feature chunks.
- **Gap:** `analyze` script is a normal build; `ANALYZE=true` stub in next.config; `PERFORMANCE_BUNDLE_ANALYTICS` unused.
- **Phase 2:** `PERFORMANCE_ADV_BUNDLE_ANALYSIS`, `PERFORMANCE_ADV_CODE_SPLITTING`.

---

## 5. Route transitions / prefetch

- PrefetchLink + keep-alive optimistic swap.
- `DashboardRouteWarmup` + optional Reports/AI warm (`PERFORMANCE_ROUTE_PREFETCH`).
- **Phase 2:** `PERFORMANCE_ADV_ROUTE_OPTIMIZATION` for measured expansion only (no stampede).

---

## 6. Hydration / Suspense / streaming

- Pattern: RSC `page.tsx` metadata + `"use client"` content.
- Suspense common on auth/settings; dashboard routes often rely on keep-alive `fallback={null}`.
- **Phase 2:** `PERFORMANCE_ADV_HYDRATION`, `PERFORMANCE_ADV_STREAMING`, Suspense skeletons under progressive render.

---

## 7. Large lists / virtualization

- Always-on virtualization: clients/projects/tasks/invoices + some communication lists (`@tanstack/react-virtual`).
- `PERFORMANCE_VIRTUAL_LISTS` exists but does not gate those lists.
- Non-virtual growers: AI conversation list, AI documents grid, notifications, file manager, team tables, some reports tables.
- **Phase 2:** `PERFORMANCE_ADV_VIRTUALIZATION` (prefer over renaming 1.4 deferred flag).

---

## 8. Surface-specific

| Surface | Finding |
|---------|---------|
| AI Assistant | Large client orchestrator; streaming UX; 1.4 opts available |
| AI Documents | List + dialogs; memo/list card paths exist |
| Reports | Charts optional lazy; data tables may grow |
| Dashboard | Thin client; widget composition cost |
| Team | Largest monolith — primary split candidate |

---

## 9. Network / assets / scripts

- RQ reduces duplicate GETs; watch mutation invalidation breadth.
- Images: remotePatterns configured; no ADV image policy.
- Third-party scripts (reCAPTCHA): load on demand today; formal strategy under `SCRIPT_LOADING`.

---

## Priority backlog (Phase 2 — design only)

1. Virtualize remaining high-cardinality lists  
2. Real bundle analyzer + deeper splits (Team, settings)  
3. Suspense / progressive shells for cold keep-alive routes  
4. Measured query-cache extensions  
5. Web Vitals dashboarding (no new product module — reuse reporter)  
6. Image / script loading policies  

---

*Audit only — no ADV optimizations applied in Phase 1.*
