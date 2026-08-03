# Provider Integration — Regression Report

## Intentional non-regressions

- No new dashboards, modules, or product routes
- AI chat SSE contract unchanged
- Notification REST/mapper shapes unchanged
- Prisma schema unchanged
- WhatsApp remains preference-gated + queue-gated
- Email still uses single `emailService`

## Behavioral deltas (expected)

| Area | Before | After |
|---|---|---|
| Voice STT/TTS | Deferred / Not Configured | Browser provider when supported |
| WhatsApp queue | Always deferred fail | Meta send when credentials + phone present |
| Email audits | Queued only (automation) | Also SENT/FAILED |
| Permissions-Policy mic | Always `()` when security headers ON | `(self)` when voice flags ON |

## Risk notes

- Web Speech quality varies by browser/locale
- WhatsApp without `user.phone` fails with clear error (retryable via queue)
- Graph message status polling may return `unknown` without webhooks
