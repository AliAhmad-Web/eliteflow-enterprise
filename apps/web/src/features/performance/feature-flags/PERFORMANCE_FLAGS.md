# Performance Feature Flags (Task 1.4)

Env-based flags for EliteFlow web performance upgrades.

- **No third-party service**
- **Defaults: all OFF**
- **Rollback:** unset / `false` + restart web

## Environment variables

| Logical flag | Env variable | Default | Phase |
|--------------|--------------|---------|-------|
| `PERFORMANCE_ENTERPRISE_FOUNDATION` | `NEXT_PUBLIC_PERFORMANCE_ENTERPRISE_FOUNDATION` | `false` | 1 |
| `PERFORMANCE_QUERY_TUNING` | `NEXT_PUBLIC_PERFORMANCE_QUERY_TUNING` | `false` | 2 |
| `PERFORMANCE_MEMOIZATION` | `NEXT_PUBLIC_PERFORMANCE_MEMOIZATION` | `false` | 2 |
| `PERFORMANCE_STABLE_CALLBACKS` | `NEXT_PUBLIC_PERFORMANCE_STABLE_CALLBACKS` | `false` | 2 |
| `PERFORMANCE_RENDER_PROFILING` | `NEXT_PUBLIC_PERFORMANCE_RENDER_PROFILING` | `false` | 1–2 (dev) |
| `PERFORMANCE_ROUTE_PREFETCH` | `NEXT_PUBLIC_PERFORMANCE_ROUTE_PREFETCH` | `false` | 2 |
| `PERFORMANCE_BUNDLE_OPTIMIZATION` | `NEXT_PUBLIC_PERFORMANCE_BUNDLE_OPTIMIZATION` | `false` | 2 |
| `PERFORMANCE_VIRTUAL_LISTS` | `NEXT_PUBLIC_PERFORMANCE_VIRTUAL_LISTS` | `false` | deferred |
| `PERFORMANCE_BUNDLE_ANALYTICS` | `NEXT_PUBLIC_PERFORMANCE_BUNDLE_ANALYTICS` | `false` | deferred |

Accepted truthy: `1`, `true`, `yes`, `on`. Falsy: `0`, `false`, `no`, `off`, empty, unset.

## Phase 1 wiring

- Flag helpers + snapshot types
- Reusable utilities under `@/features/performance`
- Audits / baseline docs in this folder

## Phase 2 wiring (applied, default OFF)

| Flag | Behavior when ON |
|------|------------------|
| `STABLE_CALLBACKS` | `usePerformanceStableCallback` on AI Assistant, AI Documents, Reports orchestrators + dialogs |
| `MEMOIZATION` | `usePerformanceMemo` for shell props; `maybeMemo` on list cards / dialogs |
| `QUERY_TUNING` | `getPerformanceQueryDefaultOverlay()` at QueryClient; per-query list `staleTime` helpers |
| `ROUTE_PREFETCH` | Idle-warm Reports + AI keep-alive chunks (in addition to current-route + dashboard) |
| `BUNDLE_OPTIMIZATION` | Lazy-split Reports charts via `ReportsChartsSectionGate` |
| `RENDER_PROFILING` | Dev-only `[perf-render]` logs on Assistant / Documents / Reports |

## Usage

```ts
import {
  isPerformanceEnterpriseFoundationEnabled,
  usePerformanceStableCallback,
  usePerformanceMemo,
  maybeMemo,
  getPerformanceFeatureFlags,
} from "@/features/performance";
```

## Docs

- [PERFORMANCE_BASELINE.md](./PERFORMANCE_BASELINE.md)
- [PERFORMANCE_COMPONENT_AUDIT.md](./PERFORMANCE_COMPONENT_AUDIT.md)
- [PERFORMANCE_REACT_QUERY_AUDIT.md](./PERFORMANCE_REACT_QUERY_AUDIT.md)
- [PERFORMANCE_BUNDLE_AUDIT.md](./PERFORMANCE_BUNDLE_AUDIT.md)
- [PERFORMANCE_REGRESSION_CHECKLIST.md](./PERFORMANCE_REGRESSION_CHECKLIST.md)
- [PERFORMANCE_PHASE2_OPTIMIZATION_REPORT.md](./PERFORMANCE_PHASE2_OPTIMIZATION_REPORT.md)
