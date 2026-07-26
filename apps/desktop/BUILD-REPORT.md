# EliteFlow Desktop — Build Report

| Field | Value |
|-------|-------|
| **Product** | EliteFlow Desktop (Enterprise Edition) |
| **Package** | `@enterprise/desktop` |
| **Version** | `1.0.0` |
| **Platform** | Windows x64 |
| **Electron** | `37.10.3` |
| **electron-builder** | `26.15.3` |
| **Shell model** | Electron loads existing EliteFlow Web client (no UI fork) |
| **Production web** | `https://eliteflow-web.vercel.app` |
| **Production API** | `https://api-production-a778.up.railway.app` |
| **Backend changes** | None |
| **Database changes** | None |
| **Build date** | 2026-07-26 |

## Deliverables

| Deliverable | Path |
|-------------|------|
| Workspace | `apps/desktop` |
| Electron main | `apps/desktop/src/main` |
| Preload (secure) | `apps/desktop/src/preload` |
| NSIS installer | `apps/desktop/release/EliteFlow-Setup-1.0.0-win-x64.exe` (~88 MB) |
| Portable build | `apps/desktop/release/EliteFlow-Portable-1.0.0-win-x64.exe` (~88 MB) |
| Unpacked app | `apps/desktop/release/win-unpacked/EliteFlow.exe` |
| Smoke script | `apps/desktop/scripts/smoke-verify.mjs` |

## Smoke verification (automated)

```
✔ Package identity
✔ Main process build
✔ Preload build
✔ Preload contextBridge
✔ nodeIntegration disabled
✔ contextIsolation enabled
✔ session persistence partition
✔ Windows EXE artifact(s)
✔ Portable build present
✔ NSIS installer present
✔ Railway API health — 200 {"status":"ok",...}
✔ Production web reachability — 200
Smoke result: 12/12 passed
```

## Feature matrix

| Capability | Status |
|------------|--------|
| Load web app (dev `localhost:3000`) | Implemented |
| Load web app (prod Vercel) | Implemented |
| Railway API via existing web client | Implemented |
| Session persistence (`persist:eliteflow`) | Implemented |
| Notifications (native IPC) | Implemented |
| File downloads | Implemented |
| File uploads | Via existing web UI |
| Clipboard | Implemented |
| Open external links | Implemented |
| Window controls | Implemented |
| Tray (optional) | `ELITEFLOW_ENABLE_TRAY=1` |
| Auto update | Architecture prepared (disabled by default) |
| Deep links `eliteflow://` | Protocol registered |
| Security hardening | nodeIntegration off, contextIsolation on, sandbox on |

## Manual verification checklist

Run the installer or portable EXE, then confirm against the live web + Railway API:

| Check | Expected |
|-------|----------|
| Login | Same EliteFlow credentials as web |
| Dashboard | Loads after auth |
| Clients / Projects / Tasks | Same web routes |
| AI Assistant | Same web + API |
| Reports | Same web routes |
| File Manager | Downloads use native handler; uploads use web |
| Notifications | In-app bell; native via `window.eliteflowDesktop` |
| Settings | Same web routes |
| Session persistence | Quit + relaunch → still signed in |
| API connectivity | Calls go to Railway through the web client |

## Installation instructions

### NSIS installer (recommended)

1. Run `apps/desktop/release/EliteFlow-Setup-1.0.0-win-x64.exe`
2. Choose install directory → Finish
3. Launch **EliteFlow** from Start Menu or Desktop
4. Sign in with your existing EliteFlow account

### Portable

1. Copy `EliteFlow-Portable-1.0.0-win-x64.exe` anywhere
2. Double-click to run (no installer)
3. Session data persists under the OS app-data path for `com.eliteflow.desktop`

### Rebuild from source

```bash
npm install
npm run desktop:dist
# or:
npm run dist --workspace=@enterprise/desktop
```

### Development

```bash
npm run web:dev
npm run desktop:dev
```

## Notes

- Desktop is another **client** of the same ecosystem — not a separate backend.
- Custom domain `eliteflow.app` is allowlisted for when DNS is attached; packaged builds currently load `eliteflow-web.vercel.app`.
- Auto-update feed target: `https://releases.eliteflow.app/desktop/` (enable with `ELITEFLOW_ENABLE_AUTO_UPDATE=1` after publishing).
- Code signing is not configured; Windows SmartScreen may warn until a certificate is added.
