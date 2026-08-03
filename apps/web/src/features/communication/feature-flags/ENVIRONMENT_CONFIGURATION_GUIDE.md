# Environment Configuration Guide — Communication Providers

Never hardcode credentials. Copy from `.env.example` into local/runtime secrets stores.

## Web (`apps/web/.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_VOICE_PROVIDER` | `browser` / `web_speech` / `none` |
| `NEXT_PUBLIC_VOICE_LANG` | BCP-47, default `en-US` |
| `NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID` | UI Ready hint (non-secret) |
| `NEXT_PUBLIC_WHATSAPP_READY` | Alternate Ready hint (`true`) |
| `NEXT_PUBLIC_EMAIL_READY` | Optional email Ready hint |
| `NEXT_PUBLIC_COMMUNICATION_*` | Feature flags (default ON) |

## API (`apps/api/.env`)

| Variable | Purpose |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Meta Cloud token |
| `WHATSAPP_PHONE_NUMBER_ID` | Sending phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verify (ops / future) |
| `EMAIL_PROVIDER` | `auto` \| `smtp` \| `resend` \| `gmail_api` \| `github_relay` |
| `SMTP_*` / `RESEND_API_KEY` / Gmail OAuth / GitHub relay | Transports |
| `EMAIL_FROM` | From header |
| `VOICE_PROVIDER` / `VOICE_API_KEY` | Ops mirror / reserved |
| `COMMUNICATION_*` | API-side flags (default ON) |

## Minimal local voice test

```
NEXT_PUBLIC_VOICE_PROVIDER=browser
NEXT_PUBLIC_COMMUNICATION_VOICE_AI=true
NEXT_PUBLIC_COMMUNICATION_SPEECH_TO_TEXT=true
NEXT_PUBLIC_COMMUNICATION_TEXT_TO_SPEECH=true
```

Use Chrome/Edge, allow microphone on AI Assistant.

## Minimal WhatsApp test

```
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
NEXT_PUBLIC_WHATSAPP_READY=true
```

Ensure target user has `phone` and WhatsApp preference enabled; run notification queue worker.

## Minimal email test

```
EMAIL_PROVIDER=smtp
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=EliteFlow <you@domain.com>
```

Or `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`.
