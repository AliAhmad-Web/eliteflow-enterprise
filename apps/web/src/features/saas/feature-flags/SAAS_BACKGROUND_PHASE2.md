# Background Processing — Phase 8 Phase 2

**Flags:** `SAAS_BACKGROUND_PROCESSING`, `SAAS_QUEUE_SCALING`

## Implemented

| Item | Detail |
|------|--------|
| Batch sizing | `resolveNotificationQueueBatchSize` (up to 50–100 when scaling ON) |
| Worker abstraction | `runNotificationQueueWorker` over existing `processNotificationQueue` |
| Retry helpers | `planNotificationQueueRetry` + `QUEUE_RETRY_PLANNED` audit |
| Metrics | Queue processed/failed recorded when usage metrics ON |

## Files

- `apps/api/src/shared/services/saas-queue.helpers.ts`
- `notification.dispatcher.ts` / `notifications.service.ts`

## Non-goals

Bull/SQS/Redis brokers, new cron daemons.
