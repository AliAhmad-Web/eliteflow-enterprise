# Bundle Audit (Task 1.4 Phase 1)

## Stack (do not replace)

| Dependency | Role | Notes |
|------------|------|-------|
| `next` 16 | App router | `optimizePackageImports`: lucide-react, framer-motion |
| `react` 19 | UI | Compiler-friendly; avoid needless useMemo by default |
| `@tanstack/react-query` | Server state | Shared client |
| `@tanstack/react-virtual` | Lists | Present but virtualization deferred behind flag |
| `framer-motion` | Motion | Import-optimized |
| `lucide-react` | Icons | Import-optimized |
| Charts | Custom SVG in reports | **No** Recharts/Chart.js |

## Code splitting (current)

| Mechanism | Status |
|-----------|--------|
| Keep-alive registry + `React.lazy` | Primary dashboard route caching |
| `next/dynamic` feature pages | Fallback / heavy panels |
| Integration monitoring charts | Dynamic import of report chart components |
| Settings heavy sections | Dynamic |

## Shared chunks / observations

| Topic | Finding |
|-------|---------|
| `@enterprise/shared` | Transpiled via `transpilePackages` |
| Monorepo turbopack root | Set in `next.config.ts` |
| Bundle analyzer | Optional (`ANALYZE=true`); dependency not required for builds |
| AI Documents page | Keep-alive registered (`ai-documents-page-content`); optional Lazy* fallback for symmetry |

## Opportunities (Phase 2+, no library swaps)

1. Align `lazy-feature-pages.tsx` with keep-alive (add LazyAiDocumentsPage for symmetry if used as fallback).
2. Split oversized `team-page-content` / communication hubs into route chunks if metrics warrant.
3. Prefer named icon imports (already aided by optimizePackageImports).
4. Avoid adding chart libraries — keep SVG.

## Phase 2 applied (behind `PERFORMANCE_BUNDLE_OPTIMIZATION`)

- `LazyAiDocumentsPage` export in `lazy-feature-pages.tsx`
- `ReportsChartsSectionGate` — dynamic import of charts when flag ON

## Out of scope (explicit)

CDN changes, image pipeline overhaul, service workers, predictive prefetch.
