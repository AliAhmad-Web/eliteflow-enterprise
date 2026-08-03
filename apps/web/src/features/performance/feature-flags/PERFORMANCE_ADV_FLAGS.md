# Advanced Performance Feature Flags (Phase 5)

Env-based flags for EliteFlow **advanced** performance work.

Complements Task 1.4 `PERFORMANCE_*` flags — does **not** replace them.

- **Defaults: all OFF**
- **Rollback:** unset / `false` + restart web

## Environment variables

| Logical flag | Env variable | Default | Phase |
|--------------|--------------|---------|-------|
| `PERFORMANCE_ADV_ENTERPRISE_FOUNDATION` | `NEXT_PUBLIC_PERFORMANCE_ADV_ENTERPRISE_FOUNDATION` | `false` | 1 |
| `PERFORMANCE_ADV_VIRTUALIZATION` | `NEXT_PUBLIC_PERFORMANCE_ADV_VIRTUALIZATION` | `false` | 2 |
| `PERFORMANCE_ADV_QUERY_CACHE` | `NEXT_PUBLIC_PERFORMANCE_ADV_QUERY_CACHE` | `false` | 2 |
| `PERFORMANCE_ADV_QUERY` | `NEXT_PUBLIC_PERFORMANCE_ADV_QUERY` | `false` | 2 |
| `PERFORMANCE_ADV_CODE_SPLITTING` | `NEXT_PUBLIC_PERFORMANCE_ADV_CODE_SPLITTING` | `false` | 2 |
| `PERFORMANCE_ADV_BUNDLE` | `NEXT_PUBLIC_PERFORMANCE_ADV_BUNDLE` | `false` | 2 |
| `PERFORMANCE_ADV_BUNDLE_ANALYSIS` | `NEXT_PUBLIC_PERFORMANCE_ADV_BUNDLE_ANALYSIS` | `false` | 2 |
| `PERFORMANCE_ADV_ROUTE_OPTIMIZATION` | `NEXT_PUBLIC_PERFORMANCE_ADV_ROUTE_OPTIMIZATION` | `false` | 2 |
| `PERFORMANCE_ADV_PREFETCH` | `NEXT_PUBLIC_PERFORMANCE_ADV_PREFETCH` | `false` | 2 |
| `PERFORMANCE_ADV_IMAGE_OPTIMIZATION` | `NEXT_PUBLIC_PERFORMANCE_ADV_IMAGE_OPTIMIZATION` | `false` | 2 |
| `PERFORMANCE_ADV_STREAMING` | `NEXT_PUBLIC_PERFORMANCE_ADV_STREAMING` | `false` | 2 |
| `PERFORMANCE_ADV_PROGRESSIVE_RENDER` | `NEXT_PUBLIC_PERFORMANCE_ADV_PROGRESSIVE_RENDER` | `false` | 2 |
| `PERFORMANCE_ADV_WEB_VITALS` | `NEXT_PUBLIC_PERFORMANCE_ADV_WEB_VITALS` | `false` | 2 |
| `PERFORMANCE_ADV_PROFILING` | `NEXT_PUBLIC_PERFORMANCE_ADV_PROFILING` | `false` | 2 |
| `PERFORMANCE_ADV_HYDRATION` | `NEXT_PUBLIC_PERFORMANCE_ADV_HYDRATION` | `false` | 2 |
| `PERFORMANCE_ADV_SCRIPT_LOADING` | `NEXT_PUBLIC_PERFORMANCE_ADV_SCRIPT_LOADING` | `false` | 2 |

Accepted truthy: `1`, `true`, `yes`, `on`.

### Phase 2 aliases

| Brief flag | Also honored by |
|------------|-----------------|
| `PERFORMANCE_ADV_QUERY` | `QUERY_CACHE` |
| `PERFORMANCE_ADV_BUNDLE` | `CODE_SPLITTING` |
| `PERFORMANCE_ADV_PREFETCH` | `ROUTE_OPTIMIZATION` |
| `PERFORMANCE_ADV_PROFILING` | `WEB_VITALS` |
| `PERFORMANCE_ADV_PROGRESSIVE_RENDER` | `STREAMING` |

## Phase 2 wiring (applied)

| Flag | Surface |
|------|---------|
| `VIRTUALIZATION` | AI conversation history, AI documents list, Team directory |
| `PROGRESSIVE_RENDER` | Suspense on AI Assistant / Documents / Reports / Team pages |
| `BUNDLE` | Team page dynamic gate; Reports charts lazy (with 1.4) |
| `PREFETCH` | Idle warm `ROUTES.TEAM` (no stampede) |
| `QUERY` | RQ overlay 15m stale / 120m gc when ON |
| `PROFILING` | Render/nav/query/bundle logs (dev); Team + AI/Reports |

## Relationship to Task 1.4

| Concern | Use |
|---------|-----|
| Stable callbacks / memo / query overlay / charts lazy / basic prefetch | `PERFORMANCE_*` (intact) |
| Virtualization expansion, progressive Suspense, ADV prefetch/query/profiling | `PERFORMANCE_ADV_*` |

## Usage

```ts
import {
  getPerformanceAdvFeatureFlags,
  isPerformanceAdvVirtualizationEnabled,
  isPerformanceAdvBundleEnabled,
  isPerformanceAdvPrefetchEnabled,
  isPerformanceAdvQueryEnabled,
  isPerformanceAdvProfilingEnabled,
  ProgressiveBoundary,
  useAdvancedPerformanceProfiler,
  PERFORMANCE_ADV_FEATURE_FLAG_IDS,
} from "@/features/performance";
```
