# Structured Data Architecture (Phase 3 — Phase 1)

**Status:** Architecture only. No JSON-LD injection in Phase 1.  
**Flags:** `SEO_JSON_LD`, `SEO_RICH_RESULTS`

---

## Goals

1. Schema.org via **JSON-LD** (preferred over microdata in React trees).  
2. Compatible with Next.js App Router (server components injecting `<script type="application/ld+json">`).  
3. Gated by flags; OFF = zero structured data (today’s behavior).  
4. Public surfaces only — never emit CRM entity graphs from private data.

---

## Target schemas (Phase 2+)

| Schema | Purpose | Candidate host |
|--------|---------|----------------|
| `Organization` | Brand entity | Root public layout or downloads layout |
| `WebSite` | Site identity + optional `SearchAction` (only if public search exists) | Same |
| `WebPage` | Per public page | Downloads pages |
| `BreadcrumbList` | Downloads › Desktop / Extension | Downloads subpages |
| `SoftwareApplication` / `WebApplication` | Product entity for EliteFlow | Downloads hub |
| `DownloadAction` (optional) | Installer links | Desktop/extension pages |

Out of scope for private dashboard: Invoice, Person PII, Project graphs.

---

## JSON-LD delivery pattern (design)

```
buildOrganizationJsonLd(siteConfig) → object
buildWebSiteJsonLd(siteConfig) → object
buildWebPageJsonLd({ name, path, description }) → object
buildBreadcrumbJsonLd(items) → object

JsonLdScript({ data }) → <script type="application/ld+json" dangerouslySetInnerHTML=… />
```

Rules:

- Serialize with `JSON.stringify` only (no user HTML).  
- Absolute URLs using preferred origin (`siteConfig.url`).  
- `@context`: `https://schema.org`  
- When `SEO_JSON_LD` OFF → do not render component.  
- When `SEO_RICH_RESULTS` OFF → omit optional rich types (e.g. SoftwareApplication); keep Organization/WebSite if JSON_LD alone is enough — or require both flags ON for product schema (recommended: **both ON** for SoftwareApplication).

---

## Organization (sketch)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "EliteFlow",
  "url": "https://eliteflow.app",
  "logo": "https://eliteflow.app/brand/eliteflow-mark.svg",
  "sameAs": ["https://github.com/…"]
}
```

---

## WebSite (sketch)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "EliteFlow",
  "url": "https://eliteflow.app",
  "publisher": { "@id": "https://eliteflow.app/#organization" }
}
```

Prefer `@id` linking between Organization and WebSite for graph consistency (GEO).

---

## WebPage + BreadcrumbList

- Emit on public download pages when flags ON.  
- Breadcrumb names must match visible UI labels.  
- Do not invent breadcrumb trails for auth/dashboard.

---

## Rich Results readiness checklist (Phase 2 validation)

| Check | Owner |
|-------|-------|
| Valid JSON-LD (Rich Results Test) | Phase 2 |
| Logo absolute URL reachable | Phase 2 |
| No conflicting Organization names | Phase 2 |
| SoftwareApplication `operatingSystem` / `offers` only if accurate | Phase 2 |
| Noindex pages must not chase rich results | Phase 2 |

---

## Explicit non-goals (Phase 1)

- No `JsonLdScript` component shipped into layouts  
- No schema packages / new dependencies  
- No microdata attributes on dashboard components  

---

*Architecture document only.*
