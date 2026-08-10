# STEP 4/5 — Android / Mobile Parity

## What existed

`apps/mobile` — Expo SDK 57 / RN app (`com.eliteflow.mobile`) already consuming the Express JWT API via `EXPO_PUBLIC_API_URL`, SecureStore tokens, RBAC via `@enterprise/shared`, and modules for clients/projects/tasks/files/chat/AI/notifications/calendar (read).

## What this step added

- CLIENT portal shell (`/(app)/portal`) with live company-scoped KPIs sections
- Invoices list/detail + payment notice
- Billing subscription status + admin cancel/reactivate (Stripe-gated)
- Whiteboards list/detail (**read-only**; no live collab claim)
- CRM pipeline board + client activities create/delete
- Calendar create + long-press delete (when `calendar:write`)
- MFA status / setup / enable / disable in Settings; login MFA method copy (TOTP vs email)
- Role-aware drawer (CLIENT vs staff) + post-auth home routing
- Removed Google test reCAPTCHA key from production EAS env; honest captcha deferred token
- `scripts/verify-mobile-parity.mjs` contract/security checks

## Build / deploy (external)

```bash
cd apps/mobile
npx eas-cli build --platform android --profile production
# or internal APK:
npx eas-cli build --platform android --profile production-apk
```

Play Store signing credentials, App Store Connect `ascAppId`, real reCAPTCHA WebView executor, and push device registration backend remain **external blockers**.

## Honesty

- Does **not** claim live Stripe payments unless `paymentsEnabled` / `stripeMode` say so
- Does **not** claim live whiteboard collab or WebRTC
- Does **not** embed DATABASE_URL / service-role / Stripe secrets
