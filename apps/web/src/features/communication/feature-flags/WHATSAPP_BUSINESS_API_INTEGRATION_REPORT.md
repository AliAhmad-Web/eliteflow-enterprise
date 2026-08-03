# WhatsApp Business API Integration Report

**Scope:** Existing NotificationDispatcher + NotificationQueue + Action Framework.  
**Provider:** Meta WhatsApp Business Cloud API.

## Flow

1. `notify({ extraChannels: [WHATSAPP] })` respects preference `whatsappEnabled`
2. Enqueues with `toAddress = user.phone`, payload `provider: META_CLOUD|DEFERRED`
3. Worker `processNotificationQueue` claims WHATSAPP when `COMMUNICATION_WHATSAPP_QUEUE` ON
4. Sends via Graph `POST /{PHONE_NUMBER_ID}/messages`
5. Audits `WHATSAPP_SENT` / `WHATSAPP_DELIVERED` / `WHATSAPP_READ` / `WHATSAPP_FAILED`
6. SaaS retry planner still records `QUEUE_RETRY_PLANNED` when SaaS background flag ON

## Files

- `apps/api/src/config/whatsapp.config.ts`
- `apps/api/src/integrations/whatsapp/whatsapp-cloud.sender.ts`
- `apps/api/src/modules/notifications/notification.dispatcher.ts`
- `apps/api/src/modules/notifications/communication-channel.helpers.ts`

## Env (API)

```
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
# optional: WHATSAPP_API_VERSION=v21.0
```

## Web readiness hint

```
NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID=
# or NEXT_PUBLIC_WHATSAPP_READY=true
```

## Requirements for successful send

- Flags ON (production defaults)
- Valid Meta token + phone number ID
- Recipient `user.phone` set (E.164 digits)
- Preference WhatsApp enabled for category

## Read / delivery status

- Immediate Graph accept → `WHATSAPP_SENT`
- Optional message status fetch when Graph returns status
- Full async webhooks intentionally not added (no new routes)

## Rollback

- Unset WhatsApp env → queue fails as `PROVIDER_DEFERRED`
- Or set `COMMUNICATION_WHATSAPP*=false`
