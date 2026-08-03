# SaaS Feature Flags (Phase 8)

Env-based flags for EliteFlow enterprise SaaS scaling readiness.

- **Defaults: all OFF**
- **Rollback:** unset / `false` + restart web (+ API)

## Environment variables

| Logical flag | Env variable | Default | Phase |
|--------------|--------------|---------|-------|
| `SAAS_ENTERPRISE_FOUNDATION` | `NEXT_PUBLIC_SAAS_ENTERPRISE_FOUNDATION` | `false` | 1 |
| `SAAS_TENANT_READINESS` | `NEXT_PUBLIC_SAAS_TENANT_READINESS` | `false` | 2 |
| `SAAS_SCALE_READINESS` | `NEXT_PUBLIC_SAAS_SCALE_READINESS` | `false` | 2 |
| `SAAS_CACHE_STRATEGY` | `NEXT_PUBLIC_SAAS_CACHE_STRATEGY` | `false` | 2 |
| `SAAS_BACKGROUND_PROCESSING` | `NEXT_PUBLIC_SAAS_BACKGROUND_PROCESSING` | `false` | 2 |
| `SAAS_QUEUE_SCALING` | `NEXT_PUBLIC_SAAS_QUEUE_SCALING` | `false` | 2 |
| `SAAS_OBSERVABILITY` | `NEXT_PUBLIC_SAAS_OBSERVABILITY` | `false` | 2 |
| `SAAS_HEALTH_MONITORING` | `NEXT_PUBLIC_SAAS_HEALTH_MONITORING` | `false` | 2 |
| `SAAS_USAGE_METRICS` | `NEXT_PUBLIC_SAAS_USAGE_METRICS` | `false` | 2 |
| `SAAS_CAPACITY_MANAGEMENT` | `NEXT_PUBLIC_SAAS_CAPACITY_MANAGEMENT` | `false` | 2 |
| `SAAS_OPERATIONAL_READINESS` | `NEXT_PUBLIC_SAAS_OPERATIONAL_READINESS` | `false` | 2 |

API also reads the same names without `NEXT_PUBLIC_`.

Accepted truthy: `1`, `true`, `yes`, `on`.

## Phase 2 wiring (default OFF)

| Flag | Behavior when ON |
|------|------------------|
| `TENANT_READINESS` | Tenant context helpers + RQ persist key suffix |
| `SCALE_READINESS` | Concurrency / batch / lazy helpers active |
| `CACHE_STRATEGY` | React Query stale/gc overlay + stable key helpers |
| `BACKGROUND_PROCESSING` | Queue retry plan audits |
| `QUEUE_SCALING` | Larger notification claim batches |
| `OBSERVABILITY` | SaaS request performance logs |
| `HEALTH_MONITORING` | Readiness probe logs on `/health` (JSON unchanged) |
| `USAGE_METRICS` | In-process counters |
| `CAPACITY_MANAGEMENT` | Soft capacity assessment |
| `OPERATIONAL_READINESS` | API startup diagnostics |

## Usage

```ts
import {
  getSaasFeatureFlags,
  buildStableQueryKey,
  mapWithConcurrency,
} from "@/features/saas";
```
