# ADR-015: Why Role-Based Access Control (RBAC)

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application serves four distinct user roles, each with fundamentally different access needs:

| Role | Access Scope |
|------|-------------|
| **Super Admin** | Full system access — all companies, all users, system settings, audit logs |
| **Admin** | Company-level access — manage employees, clients, projects, billing, reports |
| **Employee** | Assigned work — own tasks, assigned projects, team collaboration, limited client view |
| **Client** | Own data only — own projects, invoices, documents, communication with team |

Each role has a separate dashboard, navigation menu, and feature set. Authorization must be enforced at every layer: frontend routes, UI elements, API endpoints, and database queries.

---

## Problem

We need an authorization system that can:

- Enforce four distinct access levels across 20+ modules
- Control access at multiple granularities: route, page, component, API endpoint, and data row
- Prevent privilege escalation — a Client cannot access Admin endpoints by manipulating API calls
- Support granular permissions beyond roles (e.g., Admin can manage clients but not delete them)
- Work on both frontend (hide UI elements) and backend (reject unauthorized requests)
- Scale to new roles and permissions without architectural changes
- Provide clear, auditable access decisions
- Integrate with JWT tokens (ADR-014) for stateless authorization

A simple "is logged in" check is insufficient. Role checks hardcoded in every route handler do not scale and are error-prone.

---

## Decision

We will implement **Role-Based Access Control (RBAC) with permission-level granularity**.

### Authorization model:

```
User → Role → Permissions → Resources
```

- **Roles** are assigned to users (one role per user)
- **Permissions** are assigned to roles (many permissions per role)
- **Resources** are protected by permissions (e.g., `clients:read`, `invoices:write`, `team:delete`)

### Enforcement layers:

| Layer | Mechanism | Location |
|-------|-----------|----------|
| **Route protection** | Next.js Middleware — redirect unauthorized roles | `middleware.ts` |
| **Page access** | Route group layouts — `(admin)/`, `(client-portal)/` | `app/(admin)/layout.tsx` |
| **UI elements** | `usePermissions()` hook — hide buttons, menus | `hooks/use-permissions.ts` |
| **API endpoints** | `role.middleware.ts` + `permission.middleware.ts` | `apps/api/src/middleware/` |
| **Navigation** | Role-based nav config | `config/navigation.config.ts` |
| **JWT claims** | Role + permissions embedded in access token | Token payload |

### Permission naming convention:

```
[resource]:[action]

Examples:
  clients:read
  clients:write
  clients:delete
  projects:read
  projects:write
  invoices:read
  invoices:write
  invoices:send
  team:read
  team:manage
  reports:read
  settings:manage
  ai:use
  files:upload
  admin:access
```

### Role-permission matrix (stored in database):

```
Super Admin → ALL permissions
Admin       → clients:*, projects:*, tasks:*, invoices:*, team:*, reports:read, settings:manage
Employee    → projects:read, tasks:*, clients:read, calendar:*, files:upload, ai:use
Client      → projects:read (own), invoices:read (own), files:read (own), chat:write
```

### Key files:

- `packages/shared/src/constants/roles.ts` — role enum
- `packages/shared/src/constants/permissions.ts` — permission keys
- `apps/api/src/middleware/role.middleware.ts` — `requireRole('ADMIN')`
- `apps/api/src/middleware/permission.middleware.ts` — `requirePermission('clients:write')`
- `apps/web/src/hooks/use-permissions.ts` — frontend permission checks
- `apps/web/src/config/navigation.config.ts` — role-based sidebar items

---

## Consequences

### Positive

- **Defense in depth** — authorization enforced at route, UI, API, and data layers
- **Granular control** — permissions finer than roles (e.g., read vs write vs delete)
- **Scalable** — add new permissions without code changes; assign to roles in database
- **Auditable** — permission checks are explicit and loggable
- **Frontend UX** — unauthorized UI elements hidden, not just disabled
- **JWT integration** — permissions in token payload; no database lookup per request
- **Separate dashboards** — each role gets a tailored experience

### Negative

- **Complexity** — four enforcement layers must stay synchronized
- **Permission matrix maintenance** — new features require new permissions and role assignments
- **Frontend checks are UX only** — backend must always enforce; frontend hiding is not security
- **Token payload size** — many permissions increase JWT size (mitigated by compact naming)
- **Testing overhead** — each endpoint must be tested with multiple roles

### Neutral

- RBAC configuration stored in database (roles, permissions, role_permissions tables)
- Permission changes take effect on next token refresh (max 15 minutes delay)

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Simple role checks only (no permissions)** | Too coarse; cannot express "Admin can read but not delete clients" |
| **Attribute-Based Access Control (ABAC)** | Over-engineered for four roles; complex policy language; harder to audit |
| **Access Control Lists (ACL) per resource** | Does not scale to 20+ modules; per-record ACL management is burdensome |
| **Hardcoded role checks in code** | Not scalable; requires code changes for every permission change |
| **Supabase RLS only** | Database-level only; no frontend or API-level control; dual system complexity |
| **No authorization (auth only)** | Unacceptable for enterprise app with billing and client data |

---

## Why This Decision Is Best

RBAC with permission-level granularity is the standard authorization model for enterprise SaaS applications. For a platform with **four roles, 20+ modules, and sensitive financial data**, coarse role checks are insufficient and per-resource ACLs are overkill.

The permission model (`clients:read`, `invoices:write`) is human-readable, auditable, and extensible. When we add a new "Reports" module, we add `reports:read` and `reports:export` permissions and assign them to the appropriate roles — no architectural changes required.

Enforcing authorization at four layers (middleware, layout, hook, API) provides defense in depth. Even if a developer forgets a frontend check, the API middleware rejects unauthorized requests. Even if API middleware is bypassed, database queries filter by user context. This layered approach is essential for an application handling client billing and confidential business data.
