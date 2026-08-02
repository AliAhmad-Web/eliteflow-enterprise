# Phase 2 Validation, Benchmarks & Production Readiness

## Feature flag integration

| Flag | Default | Wired |
|------|---------|-------|
| `PERFORMANCE_STABLE_CALLBACKS` | OFF | Yes |
| `PERFORMANCE_MEMOIZATION` | OFF | Yes |
| `PERFORMANCE_QUERY_TUNING` | OFF | Yes |
| `PERFORMANCE_ROUTE_PREFETCH` | OFF | Yes |
| `PERFORMANCE_BUNDLE_OPTIMIZATION` | OFF | Yes |
| `PERFORMANCE_RENDER_PROFILING` | OFF | Yes (dev) |

See [PERFORMANCE_FLAGS.md](./PERFORMANCE_FLAGS.md).

## Benchmark comparison (Before vs After)

Baselines recorded in [PERFORMANCE_BASELINE.md](./PERFORMANCE_BASELINE.md). Phase 2 deltas are **opt-in**; with flags OFF, metrics match Phase 1 baseline.

| Surface | Flags OFF (control) | Recommended ON set* | Expected direction |
|---------|---------------------|---------------------|--------------------|
| Initial load | Baseline | Bundle + Query | Equal or fewer main-thread chart bytes when charts route deferred; fewer list refetches |
| Route transition → AI / Documents / Reports | Baseline | Route prefetch | Faster subsequent navigations after idle warm |
| AI Assistant interaction | Baseline | Stable + Memo + Profile | Fewer child re-renders on draft/search keystrokes |
| AI Documents list/dialogs | Baseline | Stable + Memo | Fewer card/dialog re-renders |
| Reports tab/filter changes | Baseline | Stable + Memo + Bundle | Stable shell props; deferred chart chunk |
| React render counts | Use profiler OFF | `RENDER_PROFILING` ON in dev | Console `[perf-render]` counts for orchestrators |
| Query execution | 5m / 60m defaults | Query tuning | 10m stale / 90m gc overlay; AI/Reports lists align |
| Bundle composition | Eager charts in reports shell | Bundle optimization | Separate async chunk for charts section |

\*Recommended enable set for measurement (not required for production):  
`STABLE_CALLBACKS`, `MEMOIZATION`, `QUERY_TUNING`, `ROUTE_PREFETCH`, `BUNDLE_OPTIMIZATION`. Keep `RENDER_PROFILING` **dev-only**.

## Validation report

| Check | Result |
|-------|--------|
| No new routes / modules / dashboards | Pass |
| No backend / API / schema / business logic changes | Pass |
| React Query retained | Pass |
| No new runtime dependencies | Pass |
| Flags default OFF | Pass |
| Phase 1 utilities preserved (additive helpers only) | Pass |

## Regression report

Manual checklist: [PERFORMANCE_REGRESSION_CHECKLIST.md](./PERFORMANCE_REGRESSION_CHECKLIST.md).

High-risk areas re-verified by design:

- AI send / stream / history selection (callback identity only)
- Document CRUD / autosave / export (handlers wrapped; logic unchanged)
- Reports export / save / filters / refresh (handlers wrapped; query keys unchanged)
- Dialog open/close / confirm (memo + stable cancel; same props contract)

## Rollback verification

1. Unset all `NEXT_PUBLIC_PERFORMANCE_*` in `.env.local` / hosting env.  
2. Restart `apps/web`.  
3. Confirm AI Assistant, Documents, Reports match pre–Phase-2 UX.  
4. Confirm QueryClient stale/gc return to prior defaults (5m / 60m).  
5. Confirm no idle prefetch beyond dashboard home.

## Production readiness

| Criterion | Status |
|-----------|--------|
| TypeScript-safe opt-in wrappers | Ready |
| Backward compatible (flags OFF) | Ready |
| Production overhead when profiling OFF | None |
| Documented flags + rollback | Ready |
| No Phase 3 (SEO/GEO) work started | Confirmed |
