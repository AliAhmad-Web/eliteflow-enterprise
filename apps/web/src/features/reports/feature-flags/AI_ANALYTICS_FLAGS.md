# AI Analytics Feature Flags (Task 1.3)

Env-based flags for EliteFlow `/reports` (Reports & Analytics) upgrades.

- **No third-party service**
- **Defaults: all OFF**
- **Rollback:** unset / `false` + restart web

## Environment variables

| Logical flag | Env variable | Default | Phase |
|--------------|--------------|---------|-------|
| `AI_ANALYTICS_ENTERPRISE_SHELL` | `NEXT_PUBLIC_AI_ANALYTICS_ENTERPRISE_SHELL` | `false` | 1 |
| `AI_ANALYTICS_ENHANCED_KPIS` | `NEXT_PUBLIC_AI_ANALYTICS_ENHANCED_KPIS` | `false` | 2 |
| `AI_ANALYTICS_INSIGHT_CARDS` | `NEXT_PUBLIC_AI_ANALYTICS_INSIGHT_CARDS` | `false` | 2 |
| `AI_ANALYTICS_BUSINESS_SUMMARY` | `NEXT_PUBLIC_AI_ANALYTICS_BUSINESS_SUMMARY` | `false` | 2 |
| `AI_ANALYTICS_TREND_ENHANCEMENTS` | `NEXT_PUBLIC_AI_ANALYTICS_TREND_ENHANCEMENTS` | `false` | 2 |
| `AI_ANALYTICS_RECOMMENDATION_CARDS` | `NEXT_PUBLIC_AI_ANALYTICS_RECOMMENDATION_CARDS` | `false` | 2 |
| `AI_ANALYTICS_ACTIVITY_TIMELINE` | `NEXT_PUBLIC_AI_ANALYTICS_ACTIVITY_TIMELINE` | `false` | 2 |
| `AI_ANALYTICS_ADVANCED_FILTERS` | `NEXT_PUBLIC_AI_ANALYTICS_ADVANCED_FILTERS` | `false` | 2 |
| `AI_ANALYTICS_REFRESH` | `NEXT_PUBLIC_AI_ANALYTICS_REFRESH` | `false` | 2 |
| `AI_ANALYTICS_SKELETONS` | `NEXT_PUBLIC_AI_ANALYTICS_SKELETONS` | `false` | 2 |
| `AI_ANALYTICS_ENHANCED_FEEDBACK` | `NEXT_PUBLIC_AI_ANALYTICS_ENHANCED_FEEDBACK` | `false` | 2 |

## Phase 1 wiring

`AI_ANALYTICS_ENTERPRISE_SHELL`: OFF → legacy layout; ON → modular shell.

## Phase 2 wiring (Tier A)

Any Phase 2 flag ON (or enterprise shell ON) uses the modular shell.

| Flag | Behavior when ON |
|------|------------------|
| `ENHANCED_KPIS` | Hierarchy + trend emphasis + sparklines from existing series |
| `INSIGHT_CARDS` | Compose `AiInsight` into summary + bullet cards |
| `BUSINESS_SUMMARY` | Summary panel from `summary` + KPIs |
| `TREND_ENHANCEMENTS` | Chart title polish (same chart components) |
| `RECOMMENDATION_CARDS` | `bullets[]` → recommendation cards |
| `ACTIVITY_TIMELINE` | Client timeline from analytics tables |
| `ADVANCED_FILTERS` | UI for `clientId` / `projectId` / `teamId` / statuses |
| `REFRESH` | Explicit refresh of analytics + insights |
| `SKELETONS` | KPI / chart / insight skeletons |
| `ENHANCED_FEEDBACK` | Toasts for refresh / export / save |

## Usage

```ts
import {
  isAiAnalyticsEnterpriseShellEnabled,
  getAiAnalyticsFeatureFlags,
} from "@/features/reports/feature-flags";
```

## Regression

See [AI_ANALYTICS_REGRESSION_CHECKLIST.md](./AI_ANALYTICS_REGRESSION_CHECKLIST.md).
