# EliteFlow Desktop (Enterprise Edition)

Windows desktop client for the **same** EliteFlow ecosystem as Web and Mobile.

| Layer | Source |
|-------|--------|
| UI | Existing `apps/web` (Next.js) — no UI redesign |
| API | `https://api-production-a778.up.railway.app` |
| Auth / roles / permissions | Existing JWT + refresh cookies |
| Data | Existing PostgreSQL / Supabase |
| AI, files, notifications, reports | Existing backend modules |

Desktop does **not** ship a separate backend or database.

## Architecture

```
┌──────────────────────────────────┐
│  EliteFlow Desktop               │
│  (Electron shell)                │
│  persist:eliteflow               │
└───────────────┬──────────────────┘
                │ loads
                ▼
┌──────────────────────────────────┐     HTTPS      ┌──────────────────────────┐
│  EliteFlow Web (Next.js)         │───────────────▶│  Railway API             │
│  localhost:3000 (dev)            │  /api/v1/*     │  api-production-a778…    │
│  eliteflow-web.vercel.app (prod) │                └────────────┬─────────────┘
└──────────────────────────────────┘                             │
                                                                 ▼
                                                          PostgreSQL / Supabase
```

## Development

Prerequisites: Node.js 22+, npm workspaces.

```bash
# Terminal 1 — API (optional if pointing web at Railway)
npm run api:dev

# Terminal 2 — Web
npm run web:dev

# Terminal 3 — Desktop
npm run desktop:dev
```

Desktop loads `http://localhost:3000` while unpackaged.

## Production behavior

When packaged (`app.isPackaged`), Desktop loads:

- **Web:** `https://eliteflow-web.vercel.app` (existing Next.js deployment)
- **API:** whatever that web build already uses (`NEXT_PUBLIC_API_URL` → Railway)

Override with env vars if needed (see `.env.example`). Custom domain `eliteflow.app` is allowlisted for when DNS is live.

## Session persistence

Chromium session partition `persist:eliteflow` stores:

- httpOnly refresh cookies from the API
- `auth-session-hint` cookie
- `localStorage` (user cache)

Login once → remain logged in after restart (same as a persistent browser profile).

## Native features (secure IPC)

Exposed as `window.eliteflowDesktop` via preload (`contextIsolation`, **no** `nodeIntegration`):

- Notifications
- File downloads / native file picker (uploads still use existing web forms)
- Clipboard
- Open external links
- Window controls
- Auto-update **architecture** (disabled until release feed is published)
- Tray (optional: `ELITEFLOW_ENABLE_TRAY=1`)
- Deep links prepared: `eliteflow://…`

## Build Windows installers

```bash
cd apps/desktop
npm install
npm run dist
```

Outputs in `apps/desktop/release/`:

| Artifact | Description |
|----------|-------------|
| `EliteFlow-Setup-1.0.0-win-x64.exe` | NSIS installer (~88 MB) |
| `EliteFlow-Portable-1.0.0-win-x64.exe` | Portable (no install) (~88 MB) |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Compile + launch Electron |
| `npm run build` | TypeScript → `dist/` |
| `npm run dist` | NSIS + Portable x64 |
| `npm run verify:smoke` | Artifact + API smoke checks |

## Security

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- Preload-only bridge
- Single IPC gateway (`eliteflow:invoke`) with channel allowlist
- External / navigation URL allowlists

## Version

**1.0.0** — see `BUILD-REPORT.md` after packaging.
