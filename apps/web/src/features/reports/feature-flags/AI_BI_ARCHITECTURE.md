# Business Intelligence Architecture — Phase 6 Phase 1

**Status:** Architecture only. No implementation.  
**Constraint:** Reuse `reportsService`, `useAnalytics`, `useAiInsights`, `REPORTS_QUERY_KEYS`, existing charts, permissions, and DTOs. No new module, routes, APIs, or schema.

---

## Design principles

1. **Compose, don’t fetch anew** — derive BI views from `AnalyticsDashboard` + `AiInsight`.
2. **Flag every enhancement** — `AI_BI_*` default OFF; independent rollback.
3. **Preserve Task 1.3** — `AI_ANALYTICS_*` shell/presentation remains the UX substrate.
4. **Same permissions** — `REPORTS_READ` / `REPORTS_EXPORT` only.
5. **No DTO expansion** — heuristics and selectors live in the web Reports feature.

---

## Layering (planned)

```
ReportsPageContent (orchestrator — unchanged contracts)
  └─ existing shell (legacy | AI_ANALYTICS enterprise)
       ├─ Tab surfaces (overview, revenue, …, ai-insights, saved)
       └─ [Phase 2] BI composition helpers (pure functions / hooks)
            ├─ selectExecutiveKpis(dashboard)
            ├─ scoreBusinessHealth(dashboard)
            ├─ buildOperationalSummary(dashboard)
            ├─ buildDomainIntelligence(category, dashboard)
            └─ enhanceInsightPresentation(insight, dashboard?)
```

Helpers stay under `features/reports/` (e.g. `utils/bi-*`) when Phase 2 starts — **not** a new feature package.

---

## Planned compositions

| Capability | Flag | Input | Output (presentation) |
|------------|------|-------|------------------------|
| Executive KPIs | `AI_BI_EXECUTIVE_KPIS` | `kpis[]` | Ordered subset / emphasis for Overview |
| Health score | `AI_BI_HEALTH_SCORE` | KPIs + tables | 0–100 score + factors (client-side) |
| Operational summaries | `AI_BI_OPERATIONAL_SUMMARIES` | series + tables | Short narrative blocks |
| Department summaries | `AI_BI_DEPARTMENT_SUMMARIES` | filters + productivity/attendance | Scoped copy when `departmentId` present |
| Revenue intelligence | `AI_BI_REVENUE_INTELLIGENCE` | `revenueTrend`, revenue KPIs | Revenue tab callouts |
| Client intelligence | `AI_BI_CLIENT_INTELLIGENCE` | `clientGrowth`, `topClients` | Client tab callouts |
| Project intelligence | `AI_BI_PROJECT_INTELLIGENCE` | `projectStatus`, `atRiskProjects` | Project risk callouts |
| Team productivity | `AI_BI_TEAM_PRODUCTIVITY` | `employeeProductivity`, attendance/leave | Team tab callouts |
| Invoice intelligence | `AI_BI_INVOICE_INTELLIGENCE` | `invoiceStatus`, `overdueInvoices` | Collections callouts |
| AI business summaries | `AI_BI_AI_BUSINESS_SUMMARIES` | `AiInsight.summary` + KPIs | Executive blurb layout |

---

## Health scoring (planned algorithm — not implemented)

Illustrative weighted blend from existing signals (tunable constants in Phase 2):

- Collection / invoice health (from invoice KPIs / overdue table length)
- Project risk (at-risk count / progress)
- Task completion trend
- Attendance / productivity KPIs
- Revenue trend direction

Must degrade gracefully when series empty; never block the page.

---

## Data flow

```
AnalyticsQueryInput
  → useAnalytics / useAiInsights (unchanged)
  → AnalyticsDashboard | AiInsight
  → [optional] BI selectors when AI_BI_* ON
  → existing presentational components (extended props, same layouts)
```

---

## Explicit non-goals

- Predictive ML models
- New analytics endpoints
- Data warehouse / OLAP
- Cost / usage billing analytics
- New dashboard route or BI product module

---

*Phase 2 may implement selectors behind flags; Phase 1 stops at this design.*
