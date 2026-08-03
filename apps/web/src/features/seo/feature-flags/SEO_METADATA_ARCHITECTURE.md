# Metadata Architecture (Phase 3 — Phase 1)

**Status:** Design only. Do **not** wire into layouts/pages in Phase 1.  
**Flags:** `SEO_METADATA_ENHANCEMENT`, `SEO_OPEN_GRAPH`, `SEO_TWITTER_CARDS`, `SEO_CANONICAL`

---

## Goals

1. Reuse Next.js App Router `Metadata` / `generateMetadata` — no parallel meta system.  
2. Single composition path so downloads and future public pages do not duplicate OG/Twitter fields.  
3. Every enhancement gated by `SEO_*` flags; defaults OFF preserve today’s behavior.  
4. Never invent SEO-only routes.

---

## Layers

```
siteConfig (name, description, url, …)
        │
        ▼
┌───────────────────────────┐
│ Root layout metadata      │  ← always on (existing)
│ metadataBase, title tpl,  │
│ default description       │
└───────────┬───────────────┘
            │ merge (Next.js)
┌───────────▼───────────────┐
│ Segment / layout metadata │  ← auth layout title today
└───────────┬───────────────┘
            │
┌───────────▼───────────────┐
│ Page static metadata      │  ← most dashboard/auth pages
└───────────┬───────────────┘
            │
┌───────────▼───────────────┐
│ generateMetadata (dynamic)│  ← Phase 2 for entity titles if needed
└───────────┬───────────────┘
            │
┌───────────▼───────────────┐
│ Optional helpers (flagged)│  ← Phase 2: composePageMetadata()
│ OG / Twitter / canonical  │
└───────────────────────────┘
```

---

## Global metadata (existing — keep)

File: `app/layout.tsx`

| Field | Source | Phase 2 note |
|-------|--------|--------------|
| `metadataBase` | `siteConfig.url` | Keep as preferred public origin |
| `title.default` / `title.template` | `siteConfig.name` | Keep |
| `description` | `siteConfig.description` | Optional enrichment only behind flag |

Do not replace root metadata wholesale in Phase 2 — **compose** additive fields when flags ON.

---

## Layout metadata

| Layout | Today | Phase 2 policy |
|--------|-------|----------------|
| `(auth)/layout` | `title: "Authentication"` | When `SEO_METADATA_ENHANCEMENT` ON: add `robots: { index: false }` if `SEO_ROBOTS`/`SEO_CANONICAL` policy says so |
| `(dashboard)/layout` | none | Prefer `robots: noindex` for all dashboard children when robots flag ON |
| `downloads` pages | rich metadata inline | Migrate to shared helper when metadata flag ON |

---

## Page-level metadata

**Static `export const metadata`** remains the default for CRM titles.

**Composition helper (Phase 2 sketch — not implemented):**

```ts
// Conceptual only — do not add production wiring in Phase 1
type PageMetaInput = {
  title: string;
  description?: string;
  path?: string; // for canonical
  indexable?: boolean;
};

// When SEO_METADATA_ENHANCEMENT OFF → callers keep hand-written Metadata
// When ON → helper returns Metadata with optional OG/Twitter/canonical slices
```

Helpers must live under `@/features/seo` (or thin `lib` re-export) and **only** be imported behind flag checks or dead-code-safe wrappers so OFF path is bit-identical.

---

## Dynamic metadata

Use `generateMetadata` only where entity names matter and content is **public**:

| Route class | Dynamic? | Phase 2 |
|-------------|----------|---------|
| Dashboard entity pages | Possible but **noindex** | Low SEO value — skip or titles-only for UX tab |
| Public downloads | Static OK | Optional |
| Auth | Static + noindex | Yes |

Avoid generating metadata from private API payloads for indexable pages.

---

## Metadata composition rules

1. **One source of brand strings:** `siteConfig`  
2. **Title:** page segment + root template (already works)  
3. **Description:** page override or root fallback — never invent duplicate brand blurbs in every file  
4. **Canonical:** relative path under `metadataBase` when `SEO_CANONICAL` ON  
5. **OG/Twitter:** only when respective flags ON; share image defaults from one constant  
6. **Robots:** route-class defaults when `SEO_ROBOTS` ON  

---

## Explicit non-goals (Phase 1)

- No changes to `app/layout.tsx` or page `metadata` exports  
- No `generateMetadata` additions  
- No new marketing routes for SEO  

---

*Architecture document only.*
