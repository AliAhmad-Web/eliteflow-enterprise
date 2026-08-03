# AI Insights Architecture — Phase 6 Phase 1

**Status:** Architecture only. No DTO changes. No implementation.  
**API:** Existing `GET …/reports/insights` → `AiInsight` (`summary`, `bullets[]`, `generatedAt`, `provider?`).

---

## Current experience

| Mode | Behavior |
|------|----------|
| Baseline | Card with summary + bullet list |
| `AI_ANALYTICS_INSIGHT_CARDS` | Summary + bullet cards |
| `AI_ANALYTICS_BUSINESS_SUMMARY` | Summary panel using insight + analytics KPIs |
| `AI_ANALYTICS_RECOMMENDATION_CARDS` | One card per bullet |
| `AI_ANALYTICS_ACTIVITY_TIMELINE` | Timeline from analytics tables |

All of the above remain available; `AI_BI_*` layers **additional** presentation logic.

---

## Planned evolution (client-side only)

### 1. Insight prioritization — `AI_BI_INSIGHT_PRIORITIZATION`

- Score each `bullets[]` entry with lightweight heuristics (keyword / urgency cues).
- Stable sort; original API order preserved when flag OFF.
- No backend ranking.

### 2. Categories — `AI_BI_INSIGHT_CATEGORIES`

- Map bullets to soft categories: Revenue, Clients, Projects, Team, Invoices, General.
- Heuristic classifiers over text; display as chips/labels in existing cards.
- Categories are UI metadata only — not persisted, not in DTO.

### 3. Severity — (composed with prioritization)

- Derive `low | medium | high` from the same heuristics.
- Visual tone only (existing design tokens); no schema field.

### 4. Recommendation grouping — `AI_BI_RECOMMENDATION_GROUPING`

- Cluster bullets by category before rendering recommendation cards.
- Empty clusters omitted; fallback to flat list if all “General”.

### 5. Executive summaries — `AI_BI_AI_BUSINESS_SUMMARIES`

- Lead with `insight.summary`; optionally append 1–2 KPI highlights from dashboard when already loaded.
- Does not call new AI endpoints.

### 6. Historical comparison — `AI_BI_HISTORICAL_COMPARISON`

- Prefer KPI `changePercent` / `trend` already on `KpiCard`.
- Optional narrative: “vs prior window” using those fields only (no second fetch unless Phase 2 later approves dual-range — **not** in default plan).

### 7. Trend composition — `AI_BI_TREND_COMPOSITION`

- Present paired series (e.g. revenue vs invoice status) in existing chart section when flag ON.
- Reuse `simple-charts` / sparklines — no new chart library.

---

## Integration points

```
useAiInsights(query) → AiInsight
useAnalytics(query)? → AnalyticsDashboard (when summary/timeline already need it)
  → enhanceInsightViewModel(insight, dashboard?, flags)
  → ReportsAiInsightsPanel (props extended; baseline path unchanged when flags OFF)
```

---

## Compatibility rules

1. Flags OFF → bit-identical to current Insights tab (given current `AI_ANALYTICS_*` state).
2. No changes to `aiInsightDtoSchema` / REST payloads.
3. Provider string remains informational only.
4. Errors / empty / loading paths unchanged.

---

*Implementation deferred to Phase 6 Phase 2.*
