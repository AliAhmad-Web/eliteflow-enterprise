# EliteFlow Chrome Extension — Installation Guide

**Product:** EliteFlow Chrome Extension (Enterprise Edition)  
**Version:** `1.0.0`  
**Manifest:** V3  
**Package:** `apps/extension/release/EliteFlow-Extension-1.0.0.zip`

## Prerequisites

- Google Chrome 116+ (or Chromium-based Edge)
- An existing EliteFlow account (same as Web / Desktop / Mobile)

## Install from ZIP (recommended)

1. Unzip `EliteFlow-Extension-1.0.0.zip` to a folder you will keep (do not delete it after install).
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked**.
5. Select the unzipped folder (it must contain `manifest.json`).
6. Pin **EliteFlow** from the extensions puzzle menu.

## Install from source build

```bash
npm install
npm run extension:build
```

Load unpacked from:

`apps/extension/dist`

## Sign in

1. Click the EliteFlow extension icon.
2. Sign in with your EliteFlow email and password.
3. If your org requires OTP, enter the verification code.
4. Session persists via Chrome Storage (refresh token) — reopen the popup later without signing in again.

## Verify after install

| Check | How |
|-------|-----|
| Login | Sign in with EliteFlow credentials |
| Session persistence | Close popup, reopen — still signed in |
| Dashboard | Home shows tasks / notifications / projects |
| AI | AI tab → send a prompt |
| Notifications | Alerts tab + toolbar badge |
| Context menu | Select text on any page → **Send to EliteFlow AI** |
| Save page | Right-click page → **Save to EliteFlow Project** |
| Logout | Header logout icon → returns to login |

## Open full EliteFlow Web

Use **Open Dashboard** / external-link control. Production web:

`https://eliteflow-web.vercel.app`

## Uninstall

`chrome://extensions` → EliteFlow → Remove.

## Notes

- The extension talks only to `https://api-production-a778.up.railway.app`.
- It reuses the same users, roles, permissions, AI, and business logic as other EliteFlow clients.
- Creating tasks requires `tasks:write` (typically Admin / Super Admin).
