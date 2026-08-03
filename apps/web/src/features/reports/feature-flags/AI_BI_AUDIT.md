# Enterprise Analytics & BI Audit — Phase 6 Phase 1

**Scope:** Findings only. No production BI enhancements in this phase.  
**Surface:** Existing `/reports` module (Reports & Analytics).  
**Builds on:** Task 1.3 `AI_ANALYTICS_*` shell and presentation flags.

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Orchestration | Strong | `ReportsPageContent` owns tabs, filters, RQ, export, saved |
| AI Insights tab | Present | Legacy card + enhanced panel behind `AI_ANALYTICS_*` |
| KPI cards | Present | `ReportsKpiSection` + optional sparklines |
| Charts | Light | Custom SVG (`simple-charts`); optional lazy gate (perf) |
| Analytics DTO | Stable | `AnalyticsDashboard` — KPIs, series, tables |
| AiInsight DTO | Minimal | `summary`, `bullets[]`, `generatedAt`, optional `provider` |
| React Query | Sound | `REPORTS_QUERY_KEYS` + staleTime overlay hooks |
| Saved reports | Complete CRUD | Create / update / delete / load filters into UI |
| Filters | Basic + advanced | Date range always; advanced IDs/statuses flag-gated |
| Export | Complete | PDF/EXCEL/CSV/PRINT via existing service |
| Permissions | Enforced | `REPORTS_READ` / `REPORTS_EXPORT` |
| Loading / Empty / Error | Consistent | Shared feedback components + optional skeletons |
| Cross-module analytics | Thin | Dashboard does not consume reports hooks today |
| Business metrics | Backend-composed | Frontend presents DTO as-is |

---

## 1. ReportsPageContent orchestration

- Single client orchestrator: tab state, deferred filters, query enablement per tab.
- Modular shell when any `AI_ANALYTICS_*` Phase 2 flag (or enterprise shell) is ON; else legacy layout.
- Insights query only when `activeTab === "ai-insights"`; analytics also fetched on insights when business summary / timeline flags need tables.
- Performance hooks (render profiler / ADV profiler) already attached — do not duplicate in Phase 6 Phase 1.

**Gap for Phase 2 BI:** No executive composition layer; tabs render dashboard slices independently without a shared BI view-model.

---

## 2. AI Insights tab

- Panel: `ReportsAiInsightsPanel` — loading / error / empty / legacy summary+bullets / enhanced cards.
- Enhanced modes reuse same `AiInsight` + optional `AnalyticsDashboard` (no DTO change).
- Recommendation cards map `bullets[]` 1:1; no severity/category metadata in API.

**Gap:** Prioritization, categories, severity, grouping, historical comparison are presentation-only opportunities for `AI_BI_*` (client heuristics over existing strings).

---

## 3. KPI cards & charts

- KPIs: `kpis: KpiCard[]` with optional `changePercent` / `trend` / `format`.
- Enhanced KPIs attach sparklines from related series keys (`revenue`, `clients_active`, etc.).
- Charts: revenue, client growth, project/task/invoice/attendance/leave/productivity series.
- Charts section may lazy-load under Task 1.4 / Phase 5 ADV bundle flags.

**Gap:** No executive KPI subset, no composite health score, limited cross-series narrative.

---

## 4. Analytics & AiInsight DTOs

`AnalyticsDashboard` (shared):

- Window: `from`, `to`, `range`
- `kpis[]`
- Series: `revenueTrend`, `clientGrowth`, `projectStatus`, `taskStatus`, `attendanceBreakdown`, `leaveBreakdown`, `invoiceStatus`, `employeeProductivity`
- Tables: `topClients`, `atRiskProjects`, `overdueInvoices`

`AiInsight` (shared):

- `summary: string`
- `bullets: string[]`
- `generatedAt: string`
- `provider?: string`

**Constraint:** Phase 6 must not change these contracts. BI evolution = composition / presentation over existing fields.

---

## 5. React Query usage

| Hook | Key | Notes |
|------|-----|-------|
| `useAnalytics` | `REPORTS_QUERY_KEYS.analyticsQuery(query)` | Enabled by tab |
| `useAiInsights` | `insightsQuery(query)` | Insights tab only |
| `useReportTemplates` | `templates()` | Saved tab |
| `useSavedReports` | `saved()` | Saved tab |
| Mutations | export / create / update / delete saved | Existing |

StaleTime honors performance list helpers when flags ON.

**Gap:** No dedicated BI query keys needed if Phase 2 stays presentation-only.

---

## 6. Saved reports, filters, export

- Saved: name, description, category, visibility, filters blob, favorite.
- Load saved → maps category to tab + hydrates range/advanced filters.
- Filters: `AnalyticsQueryInput` already supports client/project/team/statuses/department/employee.
- Advanced UI currently exposes subset (client/project/team/invoice/task status).
- Export: same filter bag + format; blob/print handled in `reportsService`.

**Gap:** Cross-tab filter consistency and drill-down UX are presentation concerns for `AI_BI_FILTER_CONSISTENCY` / `AI_BI_DRILL_DOWN`.

---

## 7. Permissions & states

- Gate page content on `REPORTS_READ`; export controls on `REPORTS_EXPORT`.
- Loading / Empty / Error patterns reused from common feedback; skeletons opt-in via `AI_ANALYTICS_SKELETONS`.

---

## 8. Cross-module / dashboard

- Navigation: `/reports` under `PERMISSIONS.REPORTS_READ`.
- Dashboard feature does **not** currently call `useAnalytics` / `reportsService`.
- Phase 2 must not invent a new dashboard route; optional later reuse of composed selectors inside existing dashboard widgets only if approved (out of Phase 1).

---

## 9. Priority backlog (Phase 2 — design only)

1. Executive KPI composition + optional health score (client-side)
2. Domain intelligence panels on existing tabs (revenue/clients/projects/team/invoices)
3. Insight prioritization / categories / recommendation grouping (no DTO change)
4. Historical comparison & trend composition from existing series
5. Report composition consistency, saved-report UX, export polish, filter consistency, in-page drill-down

---

*Audit only — no AI_BI production optimizations applied in Phase 1.*
