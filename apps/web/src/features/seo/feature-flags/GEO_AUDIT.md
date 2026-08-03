# GEO (Generative Engine Optimization) Audit (Phase 3 — Phase 1)

**Scope:** Readiness review for AI search / LLM discovery. No implementation.  
**Related flags:** `SEO_GEO_OPTIMIZATION` (declared OFF until Phase 2)

---

## What GEO means here

Generative engines (AI Overviews, Perplexity, ChatGPT Browse, etc.) prefer:

- Clear **entity** identity (who / what EliteFlow is)
- Stable, **citable** public pages
- **Machine-readable** facts (JSON-LD, consistent naming)
- Crawlable public content that answers “what is X / who makes X”

Authenticated SaaS apps are inherently weak GEO targets unless they expose a public knowledge layer.

---

## Evaluation

| Dimension | Readiness | Finding |
|-----------|-----------|---------|
| Entity consistency | Medium | `siteConfig.name` = EliteFlow consistently in UI/chrome; tagline “Business Automation”; description mentions “Enterprise Business Management” — three related phrasings |
| Content discoverability | Low | Primary UX is auth-gated; public pages ≈ downloads + auth; home is redirect |
| Citation opportunities | Low | Few quotable, stable public paragraphs about product capabilities |
| Knowledge Graph readiness | Low | No Organization / SoftwareApplication / sameAs links in structured data |
| AI crawler compatibility | Unknown / weak | No robots differentiation for GPTBot, ClaudeBot, Google-Extended, etc. |
| Machine-readable metadata | Partial | Basic HTML metadata; no JSON-LD; limited OG |
| Structured content quality | Low (public) | Downloads content is useful for installers; not encyclopedic product/entity copy |

---

## Entity consistency detail

| Signal | Current |
|--------|---------|
| Brand | EliteFlow |
| Tagline | Business Automation |
| Long description | Enterprise BMS for teams, clients, operations |
| Canonical site URL | `https://eliteflow.app` (`siteConfig.url`) |
| Deployed web app URL | `https://eliteflow-web.vercel.app` (`webAppUrl`) — dual public origins risk entity split |
| Repository | GitHub URL in config — potential `sameAs` candidate later |

**Risk:** Marketing domain vs Vercel app URL may confuse citation canonicalization. Phase 2 should pick one **preferred entity URL** and map the other via redirects/canonicals.

---

## Citation opportunities

| Opportunity | Status |
|-------------|--------|
| Product definition page (“What is EliteFlow?”) | Absent |
| Feature explainers (AI Assistant, Documents, Analytics) | Behind auth |
| Downloads / install facts | Present — citable for distribution channels |
| Pricing / company / contact | Not audited as present in this app tree |
| Changelog / releases manifest | `public/releases/manifest.json` — machine-readable for builds, not product narrative |

---

## AI crawler compatibility (design notes for Phase 2)

When `SEO_ROBOTS` / `SEO_GEO_OPTIMIZATION` ship:

- Explicitly allow or disallow AI bots on **public** paths only.
- Keep dashboard disallowed regardless of AI bot policy.
- Prefer allowing bots on `/downloads` if citation of install docs is desired.
- Document policy in robots comments (human + LLM readers).

---

## Machine-readable metadata gaps

1. No Organization / WebSite JSON-LD with `name`, `url`, `logo`, `sameAs`  
2. No SoftwareApplication / WebApplication schema for EliteFlow  
3. No FAQ or HowTo for install flows (downloads could support later)  
4. Inconsistent absolute URL story (`eliteflow.app` vs Vercel)

---

## GEO Phase 2 recommendations (not implemented)

1. Single preferred public origin + canonical policy  
2. Lightweight public entity page **only if product roadmap allows** (out of Phase 3 Phase 1 — may need marketing route; do not invent SEO-only routes unless approved)  
3. JSON-LD Organization + WebSite on public layouts  
4. Enrich downloads copy with stable, factual product sentences LLMs can quote  
5. Gate all GEO enhancements behind `SEO_GEO_OPTIMIZATION`  
6. Never expose private CRM/AI conversation content to crawlers  

---

*Audit only — flag declared, not applied.*
