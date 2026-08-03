# Enterprise SEO Audit (Phase 3 — Phase 1)

**Scope:** Findings only. No production SEO changes in this phase.  
**App:** EliteFlow Next.js App Router (`apps/web`)  
**Config:** `src/config/site.config.ts` (`name`, `description`, `url`, `webAppUrl`)

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Metadata coverage | Partial | Root + most pages set `title`; descriptions sparse |
| Title strategy | Basic | Root template `%s \| EliteFlow`; downloads use custom titles |
| Description strategy | Weak | Root uses `siteConfig.description`; most dashboard pages omit |
| Canonical URLs | Minimal | Only `/downloads` sets `alternates.canonical` |
| robots.txt | Missing | No `app/robots.ts` / `public/robots.txt` |
| sitemap.xml | Missing | No `app/sitemap.ts` / static sitemap |
| Open Graph | Partial | Downloads family only |
| Twitter Cards | Partial | Downloads family only |
| Structured Data / Schema.org | None | No JSON-LD found |
| Rich Results readiness | Low | No Product/SoftwareApplication/Org markup |
| Internal linking | App-centric | Sidebar / PrefetchLink; marketing crawl depth limited |
| Crawlability | Constrained | Auth-gated dashboard; public marketing thin |
| Indexability | Unclear | No robots policy; auth pages may still be crawlable |

---

## 1. Metadata coverage

| Surface | Title | Description | Notes |
|---------|-------|-------------|-------|
| Root `app/layout.tsx` | default + template | `siteConfig.description` | `metadataBase` = `siteConfig.url` |
| Auth layout | `"Authentication"` | inherit | Child pages override title |
| Auth pages (login, signup, …) | Per-page title | inherit | No unique descriptions |
| Dashboard pages | Page title only | inherit root | CRM / AI / settings |
| `/downloads` (+ desktop/extension) | Custom | Custom | Best coverage today |
| `/` home | None | inherit | Client redirect (`RoleHomeRedirect`) |

**Gap:** No shared metadata builder; duplication risk on downloads OG/Twitter fields.

---

## 2. Title strategy

- **Strength:** Consistent `template: "%s | EliteFlow"` from root.
- **Gap:** Auth layout title `"Authentication"` rarely useful as a standalone SERP title; marketing titles not differentiated for product category keywords.
- **Gap:** Dynamic routes (`channels/[id]`, `notifications/[id]`, `integrations/[slug]`) use static titles (`"Channel"`, `"Notification"`) — no entity names.

---

## 3. Description strategy

- Root description is generic enterprise BMS copy.
- Dashboard titles without page descriptions inherit the same root string → poor SERP differentiation.
- Downloads pages are the only surfaces with intent-specific descriptions.

---

## 4. Canonical URLs

- `metadataBase` is set (`https://eliteflow.app`).
- Explicit canonical only on `/downloads`.
- Desktop/extension download pages set OG `url` but not always `alternates.canonical`.
- Auth and dashboard lack noindex/canonical policy for private surfaces.

---

## 5. robots.txt

- **Not present** in App Router or `public/`.
- Default crawler behavior applies (typically allow all) — risky for authenticated app paths.

---

## 6. sitemap.xml

- **Not present.**
- No automatic listing of public marketing/download URLs.

---

## 7. Open Graph / Twitter Cards

| Surface | OG | Twitter |
|---------|----|---------|
| Downloads | Yes | Yes (`summary`) |
| Downloads desktop/extension | Yes | Yes |
| Auth / Dashboard / Root extras | No | No |

OG images use `/brand/eliteflow-mark.svg` (32×32) — weak for social previews (prefer larger PNG/JPG in Phase 2).

---

## 8. Structured Data / Schema.org / Rich Results

- No `application/ld+json` scripts.
- No Organization, WebSite, SoftwareApplication, or BreadcrumbList.
- Rich Results readiness: **not ready**.

---

## 9. Internal linking & crawlability

- Strong in-app navigation (sidebar, keep-alive, PrefetchLink).
- Public crawl graph is thin: downloads hub ↔ desktop/extension; login links to downloads.
- Most product value sits behind auth → limited organic discovery of features unless public docs/landing exist (out of scope).

---

## 10. Indexability recommendations (Phase 2 — design only)

| Class | Suggested policy |
|-------|------------------|
| Public marketing (`/downloads*`) | `index,follow` + canonical + sitemap |
| Auth flows | `noindex,nofollow` |
| Authenticated dashboard | `noindex` (or disallow in robots) |
| OAuth callback | `noindex` |

---

## Priority backlog (for Phase 2)

1. robots + sitemap for public URLs only  
2. Canonical + noindex policy by route class  
3. Shared metadata helpers (avoid downloads duplication)  
4. OG/Twitter for public surfaces with proper images  
5. JSON-LD Organization + WebSite + SoftwareApplication  
6. Do **not** SEO-optimize private CRM payloads  

---

*Audit only — no code changes to metadata in Phase 1.*
