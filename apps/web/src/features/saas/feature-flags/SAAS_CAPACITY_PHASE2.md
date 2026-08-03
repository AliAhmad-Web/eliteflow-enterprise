# Capacity Management — Phase 8 Phase 2

**Flags:** `SAAS_USAGE_METRICS`, `SAAS_CAPACITY_MANAGEMENT`

## Implemented

| Counter | Source |
|---------|--------|
| requests / slowRequests | `requestTiming` middleware |
| notificationQueue* | `processNotificationQueue` |
| aiRequests | AI `chat` / `chatStream` |
| reportGenerations | Reports `exportReport` |

| Helper | Role |
|--------|------|
| `getSaasUsageSnapshot` | In-process snapshot (null when flag OFF) |
| `assessSaasCapacity` | Soft ok/watch/critical notes |

## Files

- `apps/api/src/shared/services/saas-metrics.service.ts`

## Non-goals

Persistent metrics storage, external APM, enforcement/blocking.
