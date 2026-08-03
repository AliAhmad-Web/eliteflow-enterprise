# AI BI Feature Flags (Phase 6)

Env-based flags for EliteFlow **AI Analytics & Business Intelligence**.

Lives under `@/features/reports` — does **not** create a new analytics module.

Complements Task 1.3 `AI_ANALYTICS_*` flags — does **not** replace them.

- **Defaults: all OFF**
- **Rollback:** unset / `false` + restart web
- **Phase 1:** typed helpers + docs only — **no production BI wiring**

## Environment variables

| Logical flag | Env variable | Default | Phase |
|--------------|--------------|---------|-------|
| `AI_BI_ENTERPRISE_FOUNDATION` | `NEXT_PUBLIC_AI_BI_ENTERPRISE_FOUNDATION` | `false` | 1 |
| `AI_BI_EXECUTIVE_KPIS` | `NEXT_PUBLIC_AI_BI_EXECUTIVE_KPIS` | `false` | 2 |
| `AI_BI_HEALTH_SCORE` | `NEXT_PUBLIC_AI_BI_HEALTH_SCORE` | `false` | 2 |
| `AI_BI_OPERATIONAL_SUMMARIES` | `NEXT_PUBLIC_AI_BI_OPERATIONAL_SUMMARIES` | `false` | 2 |
| `AI_BI_DEPARTMENT_SUMMARIES` | `NEXT_PUBLIC_AI_BI_DEPARTMENT_SUMMARIES` | `false` | 2 |
| `AI_BI_REVENUE_INTELLIGENCE` | `NEXT_PUBLIC_AI_BI_REVENUE_INTELLIGENCE` | `false` | 2 |
| `AI_BI_CLIENT_INTELLIGENCE` | `NEXT_PUBLIC_AI_BI_CLIENT_INTELLIGENCE` | `false` | 2 |
| `AI_BI_PROJECT_INTELLIGENCE` | `NEXT_PUBLIC_AI_BI_PROJECT_INTELLIGENCE` | `false` | 2 |
| `AI_BI_TEAM_PRODUCTIVITY` | `NEXT_PUBLIC_AI_BI_TEAM_PRODUCTIVITY` | `false` | 2 |
| `AI_BI_INVOICE_INTELLIGENCE` | `NEXT_PUBLIC_AI_BI_INVOICE_INTELLIGENCE` | `false` | 2 |
| `AI_BI_AI_BUSINESS_SUMMARIES` | `NEXT_PUBLIC_AI_BI_AI_BUSINESS_SUMMARIES` | `false` | 2 |
| `AI_BI_INSIGHT_PRIORITIZATION` | `NEXT_PUBLIC_AI_BI_INSIGHT_PRIORITIZATION` | `false` | 2 |
| `AI_BI_INSIGHT_CATEGORIES` | `NEXT_PUBLIC_AI_BI_INSIGHT_CATEGORIES` | `false` | 2 |
| `AI_BI_RECOMMENDATION_GROUPING` | `NEXT_PUBLIC_AI_BI_RECOMMENDATION_GROUPING` | `false` | 2 |
| `AI_BI_HISTORICAL_COMPARISON` | `NEXT_PUBLIC_AI_BI_HISTORICAL_COMPARISON` | `false` | 2 |
| `AI_BI_TREND_COMPOSITION` | `NEXT_PUBLIC_AI_BI_TREND_COMPOSITION` | `false` | 2 |
| `AI_BI_REPORT_COMPOSITION` | `NEXT_PUBLIC_AI_BI_REPORT_COMPOSITION` | `false` | 2 |
| `AI_BI_SAVED_REPORT_EVOLUTION` | `NEXT_PUBLIC_AI_BI_SAVED_REPORT_EVOLUTION` | `false` | 2 |
| `AI_BI_EXPORT_ENHANCEMENTS` | `NEXT_PUBLIC_AI_BI_EXPORT_ENHANCEMENTS` | `false` | 2 |
| `AI_BI_FILTER_CONSISTENCY` | `NEXT_PUBLIC_AI_BI_FILTER_CONSISTENCY` | `false` | 2 |
| `AI_BI_DRILL_DOWN` | `NEXT_PUBLIC_AI_BI_DRILL_DOWN` | `false` | 2 |
| `AI_BI_EXECUTIVE_SUMMARY` | `NEXT_PUBLIC_AI_BI_EXECUTIVE_SUMMARY` | `false` | 2 |
| `AI_BI_BUSINESS_HEALTH` | `NEXT_PUBLIC_AI_BI_BUSINESS_HEALTH` | `false` | 2 |
| `AI_BI_DEPARTMENT_INTELLIGENCE` | `NEXT_PUBLIC_AI_BI_DEPARTMENT_INTELLIGENCE` | `false` | 2 |
| `AI_BI_RECOMMENDATIONS` | `NEXT_PUBLIC_AI_BI_RECOMMENDATIONS` | `false` | 2 |
| `AI_BI_HISTORY_COMPARE` | `NEXT_PUBLIC_AI_BI_HISTORY_COMPARE` | `false` | 2 |
| `AI_BI_REPORT_LAYOUT` | `NEXT_PUBLIC_AI_BI_REPORT_LAYOUT` | `false` | 2 |
| `AI_BI_SAVED_REPORTS` | `NEXT_PUBLIC_AI_BI_SAVED_REPORTS` | `false` | 2 |
| `AI_BI_EXPORT_EXPERIENCE` | `NEXT_PUBLIC_AI_BI_EXPORT_EXPERIENCE` | `false` | 2 |

Accepted truthy: `1`, `true`, `yes`, `on`.

### Phase 2 brief aliases

| Brief flag | Also honors |
|------------|-------------|
| `EXECUTIVE_SUMMARY` | `AI_BUSINESS_SUMMARIES`, `EXECUTIVE_KPIS`, `OPERATIONAL_SUMMARIES` |
| `BUSINESS_HEALTH` | `HEALTH_SCORE` |
| `DEPARTMENT_INTELLIGENCE` | Domain intelligence + `DEPARTMENT_SUMMARIES` |
| `RECOMMENDATIONS` | `RECOMMENDATION_GROUPING` |
| `HISTORY_COMPARE` | `HISTORICAL_COMPARISON` |
| `REPORT_LAYOUT` | `REPORT_COMPOSITION` |
| `SAVED_REPORTS` | `SAVED_REPORT_EVOLUTION` |
| `EXPORT_EXPERIENCE` | `EXPORT_ENHANCEMENTS` |

## Phase 1 wiring

- Typed helpers + snapshot under `@/features/reports/feature-flags`
- Audit / architecture / rollback / validation docs

## Phase 2 wiring (applied)

| Flag | Surface |
|------|---------|
| `EXECUTIVE_SUMMARY` | Overview (and layout) executive summary card |
| `BUSINESS_HEALTH` | Health score strip |
| `DEPARTMENT_INTELLIGENCE` | Domain intelligence cards |
| `RECOMMENDATIONS` | AI Insights grouped recommendations |
| `HISTORY_COMPARE` | KPI vs-prior table |
| `REPORT_LAYOUT` | BI lead sections before charts |
| `SAVED_REPORTS` | Saved card filter/visibility preview |
| `EXPORT_EXPERIENCE` | Export helper copy + busy state |

## Relationship to Task 1.3

| Concern | Use |
|---------|-----|
| Shell, KPI polish, insight cards, skeletons, refresh | `AI_ANALYTICS_*` |
| Executive BI composition, health, grouping, layout | `AI_BI_*` |

## Usage

```ts
import {
  getAiBiFeatureFlags,
  isAiBiExecutiveSummaryEnabled,
  isAiBiBusinessHealthEnabled,
  AI_BI_FEATURE_FLAG_IDS,
} from "@/features/reports/feature-flags";
```
