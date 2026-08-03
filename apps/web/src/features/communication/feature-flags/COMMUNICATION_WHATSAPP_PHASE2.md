# WhatsApp Automation — Phase 7 Phase 2

**Flag gates:** `COMMUNICATION_WHATSAPP` (+ `WHATSAPP_INTEGRATION`), `COMMUNICATION_WHATSAPP_QUEUE` (+ `WHATSAPP_MESSAGING`)

## Implemented

| Item | Detail |
|------|--------|
| Queue composition | `buildWhatsappQueuePayload` — deliveryState, retryPrepared, approvalCompatible |
| Channel routing | Still via `extraChannels` + `whatsappEnabled` prefs |
| Delivery state model | `provider_deferred` in payload |
| Retry preparation | `retryPrepared: true` metadata |
| Approval compatibility | `approvalCompatible: true` |
| Audit | `WHATSAPP_QUEUED`, `WHATSAPP_PROVIDER_DEFERRED` when flags ON |
| Queue processing | Claim WHATSAPP when queue flag ON → mark FAILED with deferred reason |

## Files

- `apps/api/src/config/communication-flags.ts`
- `apps/api/src/modules/notifications/communication-channel.helpers.ts`
- `apps/api/src/modules/notifications/notification.dispatcher.ts`
- `apps/api/src/modules/notifications/notifications.repository.ts` (`claimPendingQueue`)
- `features/communication/utils/whatsapp-queue.ts`

## Explicitly deferred

WhatsApp Business API, Twilio, live delivery.
