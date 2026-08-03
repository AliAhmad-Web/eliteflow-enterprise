# Email Automation UI — Validation

Exposed inside existing Notification Center (`/notifications`). No new routes, modules, dashboards, or APIs.

## Visible sections (behind `COMMUNICATION_EMAIL_*`, default ON)

1. Email Automation header + actions  
2. Email Templates (`GET /api/v1/notifications/templates`)  
3. Email Queue (`GET /api/v1/notifications/queue?channel=EMAIL`, auto-refresh)  
4. Delivery Status (counts from queue)  
5. Recent Email Activity (`GET /history`, filtered to email audits)  
6. Retry Failed Emails (`POST /queue/process` + server requeue of FAILED EMAIL)  
7. Test Email (`POST /notifications` with `sendEmail: true`, then process queue)  
8. Provider Status — Connected / Not Configured (`NEXT_PUBLIC_EMAIL_READY` / `NEXT_PUBLIC_EMAIL_PROVIDER`)

## Checks

| Check | Result |
|---|---|
| Email section visible when flags ON | Yes |
| Existing APIs only | Yes |
| Routes / schema unchanged | Yes |
| Web `tsc --noEmit` | Pass |
| API `tsc --noEmit` | Pass |
| ESLint (changed files) | Pass |

## Ops

Set `NEXT_PUBLIC_EMAIL_READY=true` when API email transport is configured so the badge shows **Connected**.
