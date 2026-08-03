# Email Automation — Phase 7 Phase 2

**Flag gates:** `COMMUNICATION_EMAIL_AUTOMATION`, `COMMUNICATION_EMAIL_TEMPLATES`

## Implemented

| Item | Detail |
|------|--------|
| Template composition | Prefer `NotificationTemplate.emailTemplate` for EMAIL HTML when templates ON |
| Template footer | `enhanceNotificationEmailHtml` marker when templates ON |
| Approval-aware metadata | `approvalAware` / `automation` on EMAIL queue payload |
| Retry preparation | `retryPrepared: true` |
| Queue metadata | Automation fields merged into existing payload JSON |
| Delivery | Still `emailService.sendNotificationEmail` — unchanged transports |

## Files

- `notification.dispatcher.ts` (flag-gated enqueue + `notifyFromTemplate`)
- `communication-channel.helpers.ts`
- `features/communication/utils/email-automation.ts`

## Explicitly deferred

SMTP redesign, provider migration, auto-send from AI without Action Framework approval.
