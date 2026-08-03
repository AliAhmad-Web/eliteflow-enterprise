# Sitemap & Robots Strategy (Phase 3 — Phase 1)

**Status:** Strategy only. No `robots.ts` / `sitemap.ts` generation in Phase 1.  
**Flags:** `SEO_SITEMAP`, `SEO_ROBOTS`, `SEO_CANONICAL`

---

## Current state

| Artifact | Present? |
|----------|----------|
| `app/robots.ts` / `robots.txt` | No |
| `app/sitemap.ts` / `sitemap.xml` | No |
| Canonical policy | Ad hoc (`/downloads` only) |

---

## Route classes

| Class | Examples | Index? | Sitemap? | Robots |
|-------|----------|--------|----------|--------|
| A — Public marketing | `/downloads`, `/downloads/desktop`, `/downloads/extension` | Yes | Yes | Allow |
| B — Auth | `/login`, `/signup`, forgot/reset/verify | No | No | Disallow or `noindex` |
| C — App (authenticated) | `/(dashboard)/*` | No | No | Disallow |
| D — Technical | `/auth/callback` | No | No | Disallow |
| E — Home `/` | Role redirect | No (or redirect-only) | No | Disallow or omit |

---

## robots.txt strategy (Phase 2)

Use Next.js `app/robots.ts` when `SEO_ROBOTS` is ON.

**Suggested production shape:**

```
User-agent: *
Allow: /downloads
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-email
Disallow: /auth/
Disallow: /dashboard
Disallow: /clients
… (all authenticated app prefixes)
Sitemap: https://eliteflow.app/sitemap.xml
```

Implementation notes:

- Prefer generating `disallow` list from a single **route-class registry** shared with metadata robots — avoid drift.  
- When flag OFF → do not add `robots.ts` (or export permissive defaults matching today). Safest OFF behavior: **no robots file** (status quo).  
- Optional AI bot stanzas only when `SEO_GEO_OPTIMIZATION` ON (see GEO audit).

---

## sitemap.xml strategy (Phase 2)

Use Next.js `app/sitemap.ts` when `SEO_SITEMAP` is ON.

**Include only Class A URLs** (absolute via `siteConfig.url`):

1. `/downloads`  
2. `/downloads/desktop`  
3. `/downloads/extension`  

Optional later (only if public pages exist): legal, docs — **do not create SEO-only routes** to pad the sitemap.

Fields: `url`, `lastModified` (build time or release manifest mtime), `changeFrequency: "weekly"`, `priority` (hub 1.0, children 0.8).

When flag OFF → no sitemap route (status quo).

---

## Canonical URL policy (Phase 2)

| Rule | Detail |
|------|--------|
| Preferred host | `siteConfig.url` (`https://eliteflow.app`) |
| Form | `alternates.canonical` relative path; Next resolves with `metadataBase` |
| Downloads | Always set canonical to self when `SEO_CANONICAL` ON |
| Auth / dashboard | Prefer `robots: noindex` over canonical gymnastics |
| Vercel preview / `webAppUrl` | Should `rel=canonical` to preferred host for public pages when indexed |

Gate with `SEO_CANONICAL`. Existing `/downloads` canonical remains valid baseline when flag OFF.

---

## Crawl directives coordination

| Mechanism | Role |
|-----------|------|
| robots.txt | Coarse path disallow |
| `metadata.robots` | Page-level noindex for auth even if somehow linked |
| sitemap | Positive signal for Class A only |
| Auth guards | Not a crawler control — still need robots/noindex |

---

## Explicit non-goals (Phase 1)

- No `app/robots.ts` or `app/sitemap.ts` files  
- No `public/robots.txt` / `public/sitemap.xml`  
- No changes to existing `/downloads` canonical  

---

*Strategy document only.*
