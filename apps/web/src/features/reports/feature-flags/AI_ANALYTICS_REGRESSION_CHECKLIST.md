# Reports & Analytics — Regression Checklist (Phase 1 + Phase 2)

## Baseline (all `AI_ANALYTICS_*` OFF)

| # | Scenario | Pass |
|---|----------|------|
| 1 | Overview / Revenue / Clients / Projects / Tasks / Team / Invoices | ☐ |
| 2 | AI Insights single card | ☐ |
| 3 | Saved reports CRUD + load | ☐ |
| 4 | Date ranges + custom filters | ☐ |
| 5 | Export formats | ☐ |
| 6 | Loading / empty / error | ☐ |
| 7 | Desktop + mobile | ☐ |

## Phase 2 — individual flags

| Flag | Scenario | Pass |
|------|----------|------|
| `ENHANCED_KPIS` | Larger values, trend emphasis, sparklines | ☐ |
| `INSIGHT_CARDS` | Summary + insight cards from bullets | ☐ |
| `BUSINESS_SUMMARY` | Summary + KPI chips on AI Insights tab | ☐ |
| `RECOMMENDATION_CARDS` | Bullets as recommendation cards | ☐ |
| `ACTIVITY_TIMELINE` | Timeline from top clients / at-risk / overdue | ☐ |
| `ADVANCED_FILTERS` | Client / project / team / status in filter sheet | ☐ |
| `REFRESH` | Refresh button refetches analytics + insights | ☐ |
| `SKELETONS` | Skeleton loaders while loading | ☐ |
| `ENHANCED_FEEDBACK` | Toasts on refresh / export / save | ☐ |

## All Phase 2 flags ON

| # | Scenario | Pass |
|---|----------|------|
| A | Combined UX works without API/DTO changes | ☐ |
| B | Permissions `reports:read` / `reports:export` unchanged | ☐ |
| C | Query keys / charts / export unchanged | ☐ |

## Rollback

| # | Check | Pass |
|---|-------|------|
| R1 | Unset all flags + restart → baseline UX | ☐ |
| R2 | Single flag OFF rolls back only that enhancement | ☐ |
