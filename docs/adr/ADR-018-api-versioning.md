# ADR-018: Why API Versioning

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application exposes a REST API via Express (`apps/api`) consumed by the Next.js frontend and potentially future clients (mobile app, third-party integrations, webhooks). The API will evolve over years as modules are added, fields change, and endpoints are restructured.

The application launches with 20+ modules and will grow. API consumers (frontend, mobile, integrations) must not break when the backend adds features or modifies responses.

---

## Problem

We need an API versioning strategy that can:

- Allow the API to evolve without breaking existing consumers
- Support the frontend deploying independently from the backend
- Enable future API consumers (mobile app, partner integrations) to use stable endpoints
- Provide a clear migration path when breaking changes are necessary
- Communicate API version in a standard, predictable way
- Support deprecation of old endpoints with sufficient notice
- Scale to v2, v3, etc. without restructuring the entire backend

Without versioning, any breaking change (renaming a field, changing response structure, removing an endpoint) immediately breaks all consumers. In a separated frontend/backend deployment, this causes production outages.

---

## Decision

We will implement **URL path-based API versioning** with all routes prefixed by `/api/v1/`.

### Versioning strategy:

| Aspect | Decision |
|--------|----------|
| **Versioning method** | URL path prefix (`/api/v1/`) |
| **Current version** | `v1` |
| **Version in response** | `X-API-Version: 1` header on all responses |
| **Breaking changes** | Require new version (`/api/v2/`) |
| **Non-breaking changes** | Added within current version (new fields, new endpoints) |
| **Deprecation** | `Deprecation` header + 6-month notice before removal |

### Route structure:

```
/api/v1/auth/login
/api/v1/auth/register
/api/v1/auth/refresh
/api/v1/clients
/api/v1/clients/:id
/api/v1/projects
/api/v1/projects/:id
/api/v1/tasks
/api/v1/invoices
/api/v1/reports
/api/v1/calendar
/api/v1/notifications
/api/v1/files
/api/v1/team
/api/v1/settings
/api/v1/ai/chat
/api/v1/ai/documents
/api/v1/dashboard/stats
/api/health                              # Unversioned health check
```

### Implementation:

- **Route aggregator** — `apps/api/src/routes/index.ts` mounts all v1 module routes under `/api/v1/`
- **Frontend API client** — `services/api/api-client.ts` uses `baseURL: '/api/v1'` (or env var)
- **API endpoint constants** — `constants/api-endpoints.ts` includes version prefix
- **Version middleware** — adds `X-API-Version` header to all responses

### Breaking vs non-breaking changes:

| Change Type | Breaking? | Action |
|-------------|-----------|--------|
| Add new endpoint | No | Add to v1 |
| Add optional field to response | No | Add to v1 |
| Add required field to request | Yes | New version or optional with default |
| Remove field from response | Yes | New version |
| Rename field | Yes | New version |
| Change field type | Yes | New version |
| Remove endpoint | Yes | Deprecate in v1, remove in v2 |

---

## Consequences

### Positive

- **Stable contract** — frontend can deploy against a known API version
- **Independent evolution** — backend can prepare v2 while v1 remains active
- **Future-proof** — mobile app, partner integrations can target specific versions
- **Clear communication** — version in URL makes API version explicit
- **Gradual migration** — run v1 and v2 simultaneously during transition periods
- **Industry standard** — URL versioning is the most common and understood approach

### Negative

- **Code duplication during migration** — v1 and v2 controllers may coexist temporarily
- **Maintenance burden** — supporting multiple versions increases testing surface
- **Version proliferation** — must resist creating new versions for non-breaking changes
- **URL length** — `/api/v1/` prefix on every endpoint (negligible)

### Neutral

- Only one version (v1) at launch; versioning infrastructure ready for future needs
- Health check endpoint (`/api/health`) is unversioned for load balancer probes

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Header versioning (`Accept: application/vnd.api.v1+json`)** | Less visible; harder to test in browser; non-standard for REST |
| **Query parameter (`?version=1`)** | Easy to forget; pollutes query strings; not RESTful |
| **No versioning** | Breaking changes break all consumers; unacceptable for enterprise API |
| **GraphQL** | Different paradigm; we use REST; versioning works differently in GraphQL |
| **Subdomain versioning (`v1.api.example.com`)** | DNS/infrastructure complexity; harder for local development |
| **Semantic versioning on API** | Confusing mapping between API version and app version |

---

## Why This Decision Is Best

URL path versioning is the simplest, most visible, and most widely adopted API versioning strategy. For an enterprise application that will serve a frontend, potential mobile app, and third-party integrations, having an explicit version in the URL (`/api/v1/clients`) makes the API contract clear to every consumer.

At launch, all endpoints live under `/api/v1/`. When a breaking change is needed — say, restructuring the invoice response format — we create `/api/v2/invoices` while keeping v1 active for existing consumers. The frontend migrates to v2 at its own pace. This decoupled evolution is essential for a production system where frontend and backend deploy independently.

The versioning infrastructure costs almost nothing to implement (a route prefix and response header) but prevents the most painful class of production incidents: silent API breaking changes.
