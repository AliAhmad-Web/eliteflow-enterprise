# Profiling Strategy (Phase 5 Phase 1)

**Status:** Architecture only. No new profilers wired in Phase 1.  
**Flags:** `PERFORMANCE_ADV_WEB_VITALS`, `PERFORMANCE_ADV_BUNDLE_ANALYSIS` (+ reuse `PERFORMANCE_RENDER_PROFILING`)

---

## Goals

1. Measure before optimizing.  
2. Reuse existing `useRenderProfiler`, Web Vitals reporter, and Task 1.4 baseline docs.  
3. Gate any new instrumentation behind `PERFORMANCE_ADV_*` (default OFF).  
4. No third-party APM required for Phase 2 MVP.

---

## Tooling map

| Concern | Tool | Today | Phase 2 plan |
|---------|------|-------|--------------|
| React re-renders | `useRenderProfiler` | Assistant/Docs/Reports | Expand under ADV flag + RENDER_PROFILING |
| React Profiler API | React DevTools | Manual | Optional `<Profiler>` wrappers behind flag |
| Web Vitals | Existing vitals reporter / `__ELITEFLOW_VITALS__` | Baseline doc | Enrich when `WEB_VITALS` ON |
| Navigation timing | PerformanceNavigationTiming | Manual DevTools | Optional beacon when WEB_VITALS ON |
| Network timing | DevTools Network + Server-Timing | API has timing middleware | Correlate in docs only |
| Query timing | React Query Devtools (dev) | Ad hoc | Document RQ event listeners behind QUERY_CACHE |
| Bundle analysis | `ANALYZE` stub | Incomplete | Wire analyzer when `BUNDLE_ANALYSIS` ON |
| Route transitions | Keep-alive + Performance | Manual | Mark start/end around PrefetchLink |

---

## React Profiler architecture (design)

```
[Feature orchestrator]
        │
        ├─ useRenderProfiler(label)     // existing, flag-gated
        └─ <Profiler id=… onRender=…>  // Phase 2 optional, ADV flag
                 └─ children
```

Rules:

- Dev-only or sampling in production (never unconditional console spam).  
- Labels stable: `AiAssistantPageContent`, `TeamPageContent`, etc.  
- Aggregate counts locally; no PII in metrics.

---

## Web Vitals architecture (design)

When `PERFORMANCE_ADV_WEB_VITALS` ON:

1. Continue existing reporter.  
2. Optionally store last N vitals in `sessionStorage` for QA.  
3. Expose read-only `window.__ELITEFLOW_VITALS__` (already referenced in baseline).  
4. Do not create a metrics dashboard module.

Metrics: LCP, INP, CLS, TTFB, FCP (+ optional long tasks).

---

## Query timing (design)

When `PERFORMANCE_ADV_QUERY_CACHE` ON (Phase 2):

- Subscribe to QueryCache events for duration histograms in dev.  
- Never change fetch semantics from profilers alone.

---

## Bundle analysis (design)

When `PERFORMANCE_ADV_BUNDLE_ANALYSIS` ON / CI job:

- Enable `@next/bundle-analyzer` (or equivalent) behind env — replace stub.  
- Artifact: HTML report; not shipped to end users.

---

## Capture playbook (unchanged from baseline)

1. `npm run build && npm run start` in `apps/web`  
2. Cold vs warm keep-alive navigations  
3. Surfaces: Login, Dashboard, AI Assistant, Documents, Reports, Team  
4. Record against [PERFORMANCE_BASELINE.md](./PERFORMANCE_BASELINE.md)

---

*Profiling architecture only — no new instrumentation in Phase 1.*
