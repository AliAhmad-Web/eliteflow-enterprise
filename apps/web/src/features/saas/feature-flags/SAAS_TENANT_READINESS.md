# Tenant Readiness Strategy — Phase 8 Phase 1

**Status:** Strategy only. **Do NOT modify the schema.** No tenant DB split.

---

## Current model

| Concept | Reality today |
|---------|----------------|
| Deployment | Single-tenant product (one customer org per deploy) |
| `OrganizationSettings` | Singleton (`key: "default"`) |
| `User.companyId` | CLIENT portal → CRM `Client` (not SaaS tenant id) |
| `organizationId` / `workspaceId` | Reserved on whiteboards / AI context — unused for isolation |
| RBAC | Global roles; no org membership table |
| Data filters | Admin = all; employee = memberships; client = company |

---

## Evolutionary path (no schema change in Phase 1)

### Stage A — Packaging (now)

Ship **one EliteFlow deployment per enterprise customer**. Isolation = infrastructure boundary. Soft multi-client portal via `companyId` continues.

**Flag:** `SAAS_TENANT_READINESS` documents/checklists only in Phase 2.

### Stage B — Logical tenant (future, beyond Phase 1 schema freeze)

When schema evolution is later approved (outside this Phase 1 brief):

1. Introduce `Organization` as first-class tenant  
2. Add membership (`OrganizationMember`) with role bindings  
3. Scope queries with `organizationId` on core entities  
4. Put `organizationId` in JWT claims + React Query keys  

Phase 1 **does not** implement these migrations.

### Stage C — Hard isolation (explicitly out of roadmap)

Separate DB per tenant, sharding, multi-region — **out of scope**.

---

## Strategies using existing platform

| Concern | Plan without schema change |
|---------|----------------------------|
| Tenant isolation | Prefer deploy-per-customer; enforce company/role filters strictly |
| Organization scaling | Tune `OrganizationSettings` / billing singleton for large single org |
| Workspace scalability | Treat `/workspace` permission map as UX workspace, not tenancy |
| Permission scalability | Keep shared `PERMISSIONS` catalog; cache permission refresh when Security flags allow |
| Data partition planning | Document candidate partition keys (`organizationId`, `companyId`, time) for **future** migrations — no Prisma edits now |

---

## Permission scalability

1. Retain canonical permission keys in `@enterprise/shared`.  
2. Avoid exploding role count — use role templates per customer deploy.  
3. When multi-org arrives later, bind permissions via membership, not duplicate global roles.  
4. Coordinate with `SECURITY_PERMISSION_REFRESH` — plan short TTL cache (Phase 2 helper, optional).

---

## Data partition planning (documentation only)

| Domain | Current scope key | Future partition candidate |
|--------|-------------------|----------------------------|
| Projects / Tasks | membership / client | `organizationId` |
| Invoices | client / company | `organizationId` |
| Communication | conversation members | `organizationId` |
| Notifications | `userId` | `organizationId` + user |
| AI conversations | `userId` | `organizationId` + user |
| Files | actor company | `organizationId` + storage prefix |

---

## Explicit non-goals

- Schema modifications  
- Tenant database split  
- Billing / subscription engines  
- Breaking RBAC contracts  

---

*Phase 2 may add readiness helpers/checklists behind `SAAS_TENANT_READINESS`; Phase 1 stops here.*
