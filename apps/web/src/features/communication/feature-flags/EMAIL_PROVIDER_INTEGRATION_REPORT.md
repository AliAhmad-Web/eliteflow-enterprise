# Email Provider Integration Report

**Scope:** Existing `emailService` + NotificationQueue EMAIL channel (no second mailer).

## Delivery path

1. Dispatcher enqueues EMAIL with HTML/text + automation metadata
2. Worker calls `emailService.sendNotificationEmail`
3. Transport selected by `EMAIL_PROVIDER` preference or auto order:
   - `gmail_api` → `github_relay` → `smtp` → `resend`
4. Audits `EMAIL_QUEUED` / `EMAIL_SENT` / `EMAIL_FAILED` when automation/orchestration flags ON
5. Template enhancement via existing `enhanceNotificationEmailHtml` + `notifyFromTemplate`

## Env

```
EMAIL_PROVIDER=auto   # auto | smtp | resend | gmail_api | github_relay
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
RESEND_API_KEY=
EMAIL_FROM=
# Gmail API / GitHub relay as previously documented
```

## Changes in this integration

- `EMAIL_PROVIDER` preference in `email.config.ts`
- Delivery tracking audits on send/fail
- `.env.example` documentation

## Rollback

- Clear email credentials → transport `none` (send throws, queue marks failed)
- `COMMUNICATION_EMAIL_AUTOMATION=false` disables automation metadata/audits (core email still works if prefs enable email)
