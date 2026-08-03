# Provider Integration — Production Readiness Report

## Verdict

**Ready for staged production** when credentials are provisioned per environment. Architecture remains Phase 7 — no new product surface.

## Readiness matrix

| Provider | Code | Secrets | Ops dependency |
|---|---|---|---|
| Voice (browser) | Done | None (optional lang) | HTTPS + mic allow + Chrome/Edge |
| WhatsApp Meta | Done | Token + phone number ID | Meta Business account; user phones |
| Email | Done (pre-existing + preference) | SMTP/Resend/Gmail/relay | Verified from-domain |

## Go-live checklist

- [ ] Set web voice env + confirm mic Permissions-Policy
- [ ] Set API WhatsApp secrets; set `NEXT_PUBLIC_WHATSAPP_READY` or phone number ID on web
- [ ] Confirm `EMAIL_PROVIDER` + transport; send test notification email
- [ ] Confirm notification queue worker runs in production
- [ ] Confirm feature flags remain ON (or explicitly set)
- [ ] Document rollback owners

## Out of scope (by design)

- New webhook routes for WhatsApp inbound/status
- Cloud STT/TTS billed APIs (browser provider satisfies real mic/STT/TTS without new routes)
- Duplicate messaging or email services
