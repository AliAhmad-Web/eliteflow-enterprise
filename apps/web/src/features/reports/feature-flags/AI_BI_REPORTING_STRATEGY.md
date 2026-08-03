# Enterprise Reporting Strategy — Phase 6 Phase 1

**Status:** Strategy only. Reuse existing Reports infrastructure. No new reporting engine.

---

## Current infrastructure (keep)

| Piece | Role |
|-------|------|
| Tabs + `REPORTS_TAB_TO_CATEGORY` | Category navigation |
| `AnalyticsQueryInput` | Shared filter contract |
| `reportsService` | Analytics, insights, templates, saved, export |
| Saved reports CRUD | Persist filters + category + visibility |
| Templates | System/default filter presets |
| Export formats | PDF, EXCEL, CSV, PRINT |
| Permissions | `REPORTS_READ`, `REPORTS_EXPORT` |

---

## 1. Report composition — `AI_BI_REPORT_COMPOSITION`

**Goal:** Consistent section order across domain tabs when flag ON.

Suggested composition (presentation):

1. Optional BI callout / health (if those flags ON)
2. KPI strip (existing / executive subset)
3. Primary chart(s)
4. Domain tables
5. Optional AI blurb (if insights already available — do not force insights fetch on every tab)

When OFF → current tab layouts unchanged.

---

## 2. Saved report evolution — `AI_BI_SAVED_REPORT_EVOLUTION`

**In scope (Phase 2 presentation):**

- Clearer filter preview from `filters` blob
- Favorite / visibility affordances already in DTO — polish UX only
- Load path already hydrates tab + filters — keep contract

**Out of scope:** New visibility models, sharing APIs, collaborative editing.

---

## 3. Export strategy — `AI_BI_EXPORT_ENHANCEMENTS`

- Keep `exportReport` input/formats.
- Optional: include composed section titles in client-side print HTML only when flag ON (if export path allows without API change).
- No new export formats in Phase 6.

---

## 4. Filter architecture — `AI_BI_FILTER_CONSISTENCY`

- Single source of truth remains `analyticsQuery` in `ReportsPageContent`.
- Phase 2: ensure advanced filters (including unused schema fields like `departmentId` / `employeeId` if UI exposed) stay deferred and consistent across tabs.
- Do not fork filter state per tab.

---

## 5. Cross-report consistency

- Shared formatters already in `reports.types` (`formatCurrency`, `formatKpiValue`, …).
- Phase 2 BI helpers must use the same formatters.
- Empty/error copy should stay aligned with existing EmptyState / ErrorState patterns.

---

## 6. Drill-down planning — `AI_BI_DRILL_DOWN`

**Allowed:** In-page expand / highlight of table rows; deep-link to existing CRM routes via existing entity IDs in tables (`topClients.id`, `atRiskProjects.id`, `overdueInvoices.id`) using current app navigation helpers.

**Forbidden:** New analytics routes, modal “BI explorer” product, or schema changes.

---

## Rollout order (Phase 2 suggestion)

1. `REPORT_COMPOSITION` + `FILTER_CONSISTENCY`
2. Domain intelligence flags (revenue → invoices)
3. Insight evolution flags
4. `SAVED_REPORT_EVOLUTION` + `EXPORT_ENHANCEMENTS`
5. `DRILL_DOWN` last (highest UX risk)

Each step independently flag-gated.

---

*Phase 1 delivers this strategy document only.*
