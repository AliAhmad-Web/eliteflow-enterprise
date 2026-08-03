# AI BI Rollback Strategy — Phase 6

**Goal:** Every future BI enhancement disables via env without a code rollback.

---

## Principles

1. **Default OFF** — production matches today’s `/reports` behavior when `AI_BI_*` unset.  
2. **Independent flags** — disable health score without disabling insight grouping, etc.  
3. **Fail open to baseline** — BI helpers must not throw; fall back to existing panels.  
4. **Compose with Task 1.3** — turning OFF `AI_BI_*` must not require toggling `AI_ANALYTICS_*`.

---

## Per-flag rollback

| Flag | Enable effect (Phase 2 planned) | Rollback |
|------|----------------------------------|----------|
| `ENTERPRISE_FOUNDATION` | Marker / umbrella docs | Unset |
| `EXECUTIVE_KPIS` | Executive KPI strip | Unset → full/default KPI section |
| `HEALTH_SCORE` | Composite score UI | Unset → no score |
| `OPERATIONAL_SUMMARIES` | Ops narrative | Unset → prior tab content |
| `DEPARTMENT_SUMMARIES` | Dept-scoped copy | Unset |
| `REVENUE_INTELLIGENCE` | Revenue callouts | Unset |
| `CLIENT_INTELLIGENCE` | Client callouts | Unset |
| `PROJECT_INTELLIGENCE` | Project callouts | Unset |
| `TEAM_PRODUCTIVITY` | Team callouts | Unset |
| `INVOICE_INTELLIGENCE` | Invoice callouts | Unset |
| `AI_BUSINESS_SUMMARIES` | Executive insight layout | Unset → prior insight panel |
| `INSIGHT_PRIORITIZATION` | Reordered bullets | Unset → API order |
| `INSIGHT_CATEGORIES` | Category chips | Unset |
| `RECOMMENDATION_GROUPING` | Clustered cards | Unset → flat cards |
| `HISTORICAL_COMPARISON` | Prior-period narrative | Unset |
| `TREND_COMPOSITION` | Multi-series presentation | Unset → prior charts |
| `REPORT_COMPOSITION` | Section reordering | Unset → prior layout |
| `SAVED_REPORT_EVOLUTION` | Saved UX polish | Unset |
| `EXPORT_ENHANCEMENTS` / `EXPORT_EXPERIENCE` | Export polish | Unset → prior export |
| `FILTER_CONSISTENCY` | Filter UX alignment | Unset |
| `DRILL_DOWN` | In-page / link drill | Unset → static tables |
| `EXECUTIVE_SUMMARY` | Executive summary card | Unset |
| `BUSINESS_HEALTH` | Health score strip | Unset |
| `DEPARTMENT_INTELLIGENCE` | Domain intelligence cards | Unset |
| `RECOMMENDATIONS` | Grouped insight bullets | Unset → prior insight list |
| `HISTORY_COMPARE` | KPI vs-prior table | Unset |
| `REPORT_LAYOUT` | BI lead layout | Unset → prior chart order |
| `SAVED_REPORTS` | Saved card preview polish | Unset |

Restart `apps/web` after env changes.

---

## Emergency order

If UI breaks after enabling multiple `AI_BI_*` flags:

1. Disable `REPORT_LAYOUT` / `DRILL_DOWN` / `DEPARTMENT_INTELLIGENCE`  
2. Disable insight flags (`RECOMMENDATIONS`, `HISTORY_COMPARE`, `EXECUTIVE_SUMMARY`)  
3. Disable `BUSINESS_HEALTH` / domain flags  
4. Disable remaining `AI_BI_*`  
5. Confirm `AI_ANALYTICS_*` state (usually leave as-was)

---

## Phase 2 verification

All `AI_BI_*` unset → BI sections no-op; `/reports` matches Task 1.3 baseline for the current `AI_ANALYTICS_*` state.
