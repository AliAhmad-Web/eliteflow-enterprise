# EliteFlow Chrome Extension (Enterprise Edition)

Manifest V3 client for the **same** EliteFlow ecosystem as Web, Desktop, and Mobile.

| Layer | Source |
|-------|--------|
| UI | Extension popup (EliteFlow design tokens) |
| API | `https://api-production-a778.up.railway.app` |
| Auth / roles / permissions | Existing JWT + refresh cookie pattern (mobile-compatible) |
| Data | Existing PostgreSQL / Supabase via Railway API |
| AI, notifications, tasks, projects, clients | Existing backend modules |

This extension does **not** ship a separate backend or database.

## Architecture

```
┌──────────────────────────────────┐
│  EliteFlow Chrome Extension      │
│  (MV3 popup + service worker)    │
│  chrome.storage session/local    │
└───────────────┬──────────────────┘
                │ HTTPS /api/v1/*
                ▼
┌──────────────────────────────────┐
│  Railway API                     │
│  api-production-a778.up.railway… │
└───────────────┬──────────────────┘
                ▼
         PostgreSQL / Supabase
```

## Features

1. **Authentication** — EliteFlow login, OTP support, session persistence, logout
2. **Quick Dashboard** — today's tasks, unread notifications, recent projects, pending approvals, AI quick access
3. **AI Assistant** — popup chat against `/api/v1/ai/chat`
4. **Notifications** — unread list, badge polling, open related web page
5. **Quick Actions** — create task, create note, search client/project, open dashboard
6. **Browser integration** — context menu: send selection to AI; save page to EliteFlow

## Development

```bash
npm install
npm run extension:build
# or watch:
npm run extension:dev
```

Then load `apps/extension/dist` as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

## Production package

```bash
npm run extension:build
npm run extension:verify
```

Artifacts:

- Unpacked build: `apps/extension/dist`
- ZIP: `apps/extension/release/EliteFlow-Extension-1.0.0.zip`

## Security

- Manifest V3
- Least permissions (`storage`, `contextMenus`, `alarms`, `notifications`, `activeTab`)
- Host permissions limited to EliteFlow API + web origins
- No secrets in the package
- No `unsafe-eval` / remote code

## Version

`1.0.0`
