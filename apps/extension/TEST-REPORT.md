# EliteFlow Chrome Extension — Test Report

| Field | Value |
|-------|-------|
| **Product** | EliteFlow Chrome Extension (Enterprise Edition) |
| **Version** | `1.0.0` |
| **Date** | 2026-07-26 |
| **API under test** | `https://api-production-a778.up.railway.app` |
| **Automated smoke** | `22/22 passed` |

## Automated checks

| Check | Result |
|-------|--------|
| Package identity `@enterprise/extension` | Pass |
| Version `1.0.0` | Pass |
| Production `dist/` present | Pass |
| Manifest V3 | Pass |
| Service worker present | Pass |
| Popup HTML present | Pass |
| Icons 16/48/128 | Pass |
| Least-privilege permissions | Pass |
| Railway host permission | Pass |
| CSP without `unsafe-eval` | Pass |
| Production ZIP | Pass |
| Railway `/api/v1/health` | Pass (`status: ok`) |

## Manual verification checklist

Load `apps/extension/dist` (or unzip the production ZIP) via Chrome → Developer mode → Load unpacked, then confirm:

| Check | Expected | How to verify |
|-------|----------|---------------|
| **Login** | Signs in with existing EliteFlow credentials | Popup → email/password |
| **Logout** | Clears session and returns to login | Header logout control |
| **Session persistence** | Still signed in after closing popup / restarting Chrome | Reopen popup after quit |
| **API** | Calls Railway `/api/v1/*` with Bearer token | DevTools → Network in service worker / popup |
| **AI** | Assistant replies from `/ai/chat` | AI tab → send prompt |
| **Notifications** | Unread list + toolbar badge | Alerts tab; wait for poll / refresh |
| **Popup** | EliteFlow-branded dashboard / nav | Home / AI / Alerts / Actions |
| **Context menu** | Selection → Send to EliteFlow AI | Select text → right-click |
| **Context menu** | Page → Save to EliteFlow Project | Right-click page |
| **Chrome Storage** | Refresh token + user cache persist | `chrome.storage.local` in DevTools |
| **Production Build** | ZIP loads as unpacked extension | `release/EliteFlow-Extension-1.0.0.zip` |

## Auth / session notes

- Access JWT stored in memory + Chrome storage
- Refresh token stored in `chrome.storage.local`
- Production refresh uses Cookie header `__Secure-refresh-token` / `refresh-token` (mobile-compatible)
- Logout calls `POST /api/v1/auth/logout` then clears local storage

## Known environment constraints

- Creating tasks requires `tasks:write` (Admin / Super Admin typically)
- Pending approvals map to `GET /api/v1/team/leaves?status=PENDING`
- Notes map to AI documents (`POST /api/v1/ai/documents`) — no separate notes microservice
- Today's tasks are filtered client-side from assigned tasks by `dueDate`

## Verdict

**Ready for Chrome unpacked / ZIP install** against the production EliteFlow Railway API, with no backend or database changes.
