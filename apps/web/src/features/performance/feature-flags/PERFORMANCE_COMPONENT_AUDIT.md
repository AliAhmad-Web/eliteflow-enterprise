# Component Performance Audit (Task 1.4 Phase 1)

Opportunities only — **do not change behavior in Phase 1**. Apply in Phase 2 behind `PERFORMANCE_MEMOIZATION` / `PERFORMANCE_STABLE_CALLBACKS`.

## Hotspots

| Area | Observation | Opportunity | Risk if done poorly |
|------|-------------|-------------|---------------------|
| `AiAssistantPageContent` | Large orchestrator; shell props rebuilt each render | `useStableCallback` for handlers; stabilize `shellProps` with memo when flags ON | Stale closures |
| `AiDocumentsPageContent` | Same pattern as assistant | Same | Same |
| `ReportsPageContent` | Flag reads + large `shellProps` object | Memoize shell props when `PERFORMANCE_MEMOIZATION` ON | Missed updates |
| `ReportsChartsSection` | Switch + chart trees | Already presentational; avoid remounting charts on unrelated parent state | Blank charts |
| `team-page-content` | Very large monolith | Phase 2 extract + memo list rows | Regressions |
| `communication` message lists | Long lists | Virtual lists only under `PERFORMANCE_VIRTUAL_LISTS` (deferred) | Scroll jumps |
| Keep-alive outlet | Caches up to 28 pages | Already strong; avoid unnecessary remount | Memory |

## Re-render patterns

| Pattern | Where | Recommendation |
|---------|-------|----------------|
| Inline object/array in JSX props | Many page contents | Extract constants or memo when flag ON |
| New function props each render | Toolbar / list callbacks | `useStableCallback` when `PERFORMANCE_STABLE_CALLBACKS` ON |
| Derived filters without memo | Reports / AI list queries | `useMemo` already used for query objects — keep |
| Context value identity | Providers | Audit before widening context |

## Expensive derived work

| Location | Work | Notes |
|----------|------|-------|
| Reports insights composition | Client timeline / cards | Only on AI Insights tab when analytics flags ON |
| MarkdownView parse | Assistant / documents | Already lightweight custom parser — do not replace lib |
| SVG charts | Reports `simple-charts` | No chart library; fine for current scale |

## Memoization guidance (Phase 2)

1. Prefer presentational memo on **list items** first (cards, rows).
2. Stabilize orchestrator callbacks before memoizing children.
3. Measure with `PERFORMANCE_RENDER_PROFILING` in development.
4. Never memoize without a regression checklist pass.
