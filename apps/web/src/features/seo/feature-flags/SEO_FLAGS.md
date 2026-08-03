# SEO / GEO Feature Flags (Phase 3)

Env-based flags for EliteFlow web SEO and Generative Engine Optimization.

- **No third-party SEO service**
- **Defaults: all OFF**
- **Rollback:** unset / `false` + restart web

## Environment variables

| Logical flag | Env variable | Default | Phase |
|--------------|--------------|---------|-------|
| `SEO_ENTERPRISE_FOUNDATION` | `NEXT_PUBLIC_SEO_ENTERPRISE_FOUNDATION` | `false` | 1 |
| `SEO_METADATA_ENHANCEMENT` | `NEXT_PUBLIC_SEO_METADATA_ENHANCEMENT` | `false` | 1 (alias → dynamic) |
| `SEO_DYNAMIC_METADATA` | `NEXT_PUBLIC_SEO_DYNAMIC_METADATA` | `false` | 2 |
| `SEO_OPEN_GRAPH` | `NEXT_PUBLIC_SEO_OPEN_GRAPH` | `false` | 2 |
| `SEO_TWITTER_CARDS` | `NEXT_PUBLIC_SEO_TWITTER_CARDS` | `false` | 2 |
| `SEO_JSON_LD` | `NEXT_PUBLIC_SEO_JSON_LD` | `false` | 1 (alias → structured) |
| `SEO_STRUCTURED_DATA` | `NEXT_PUBLIC_SEO_STRUCTURED_DATA` | `false` | 2 |
| `SEO_SITEMAP` | `NEXT_PUBLIC_SEO_SITEMAP` | `false` | 2 |
| `SEO_ROBOTS` | `NEXT_PUBLIC_SEO_ROBOTS` | `false` | 2 |
| `SEO_CANONICAL` | `NEXT_PUBLIC_SEO_CANONICAL` | `false` | 1 (alias → canonical URLs) |
| `SEO_CANONICAL_URLS` | `NEXT_PUBLIC_SEO_CANONICAL_URLS` | `false` | 2 |
| `SEO_RICH_RESULTS` | `NEXT_PUBLIC_SEO_RICH_RESULTS` | `false` | 2 |
| `SEO_GEO_OPTIMIZATION` | `NEXT_PUBLIC_SEO_GEO_OPTIMIZATION` | `false` | 1 (enables all GEO) |
| `SEO_ENTITY_OPTIMIZATION` | `NEXT_PUBLIC_SEO_ENTITY_OPTIMIZATION` | `false` | 2 |
| `SEO_CITATION_OPTIMIZATION` | `NEXT_PUBLIC_SEO_CITATION_OPTIMIZATION` | `false` | 2 |
| `SEO_KNOWLEDGE_GRAPH` | `NEXT_PUBLIC_SEO_KNOWLEDGE_GRAPH` | `false` | 2 |
| `SEO_AI_CRAWLERS` | `NEXT_PUBLIC_SEO_AI_CRAWLERS` | `false` | 2 |

Accepted truthy: `1`, `true`, `yes`, `on`.

## Phase 2 wiring (applied, default OFF)

| Flag | Behavior when ON |
|------|------------------|
| `DYNAMIC_METADATA` | Keywords + composition via `composePublicPageMetadata` |
| `OPEN_GRAPH` / `TWITTER_CARDS` | Overlay OG / Twitter on public pages |
| `CANONICAL_URLS` | Canonical + indexable robots on public pages |
| `ROBOTS` | Strict `robots.ts` + `noindex` on auth/dashboard/home/callback |
| `SITEMAP` | Public Class A URLs in `sitemap.ts` |
| `STRUCTURED_DATA` | Organization / WebSite / WebPage / BreadcrumbList JSON-LD |
| `RICH_RESULTS` | Extra logo/image fields on Organization |
| GEO flags | Entity `@id` / sameAs, citation copy, KG links, AI bot rules |

When all metadata-related flags are OFF, public pages return their **baseline** Metadata (pre–Phase-2).

## Usage

```ts
import {
  composePublicPageMetadata,
  PublicPageJsonLd,
  getSeoFeatureFlags,
} from "@/features/seo";
```
