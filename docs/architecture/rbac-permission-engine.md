# Phase 3 — Enterprise RBAC & Permission Engine

**Status:** Implemented  
**Date:** 2026-07-22  
**Scope:** API authorization middleware, shared permission engine, frontend hooks/guards, navigation filtering, role route shells

---

## 1. Permission model

```
User → Role → Permissions → Resources
```

| Role | Typical access |
|------|----------------|
| `SUPER_ADMIN` | Full system + `admin:access` |
| `ADMIN` | Company modules (no `system:manage` / `admin:access`) |
| `EMPLOYEE` | Assigned work modules |
| `CLIENT` | Portal-scoped read access |

Permissions use `[resource]:[action]` keys defined in `@enterprise/shared` as `PERMISSIONS`.

Never hardcode permission strings in UI components — import `PERMISSIONS` or resolve from authenticated user context.

---

## 2. Permission flow

```
Login / OAuth / OTP
    ↓
JWT embeds role + permissions[]
    ↓
Frontend: Zustand SafeUser.permissions
API: req.auth.permissions
    ↓
permissionEngine / permissionService
    ↓
Route guards · Nav filter · Middleware · Component guards
```

---

## 3. Authorization flow (API)

```
Request
  → authenticate()           // JWT → req.auth
  → authorizeRoles(...)      // optional role gate
  → authorizePermissions(...)// require ALL
  or authorizeAnyPermission(...)
  or authorizeAllPermissions(...)
  → Controller
```

Denied requests return `403` with `AUTH_FORBIDDEN` and write an audit log (`authz.*`).

---

## 4. Role hierarchy (redirect)

| Role | Home route |
|------|------------|
| SUPER_ADMIN | `/admin` |
| ADMIN | `/dashboard` |
| EMPLOYEE | `/dashboard` |
| CLIENT | `/portal` |

---

## 5. Frontend architecture

| Layer | Mechanism |
|-------|-----------|
| Auth | `AuthGuard` |
| Role shell | `RoleRouteGuard` / `DashboardRoleGuard` |
| UI | `PermissionGuard`, `RoleGuard`, `AnyPermissionGuard`, `AllPermissionsGuard` |
| Logic | `usePermissions`, `useRole`, `useCan`, `useHasPermission`, … |
| Nav | `filterNavigationByAccess(MAIN_NAVIGATION, subject)` |
| Actions | `filterActionsByPermission` |

Components must not compare role strings directly — use hooks/guards.

---

## 6. Backend middleware

| Middleware | Purpose |
|------------|---------|
| `authenticate` | Require valid JWT |
| `authorizeRoles(...roles)` | Require one of roles |
| `authorizePermissions(...perms)` | Require all permissions |
| `authorizeAnyPermission(...perms)` | Require any permission |
| `authorizeAllPermissions(...perms)` | Require all permissions |

Import barrel: `apps/api/src/shared/authorization.ts`

---

## 7. Security rules

1. Backend is the source of truth — UI hiding is UX only.
2. Permissions come from JWT claims loaded from DB role matrix at login/refresh.
3. Use shared `PERMISSIONS` constants only.
4. Audit every authorization denial.
5. Future business modules must chain `authenticate` + permission middleware.
6. Unauthenticated → `401`; authenticated but unauthorized → `403 AUTH_FORBIDDEN`.

---

## 8. Example API route (future module)

```ts
import { PERMISSIONS } from "@enterprise/shared";
import {
  authenticate,
  authorizePermissions,
} from "../shared/authorization.js";

router.post(
  "/clients",
  authenticate,
  authorizePermissions(PERMISSIONS.CLIENTS_WRITE),
  createClientHandler,
);
```

## 9. Example UI

```tsx
import { PERMISSIONS } from "@enterprise/shared";
import { PermissionGuard } from "@/features/rbac";

<PermissionGuard permission={PERMISSIONS.CLIENTS_WRITE}>
  <CreateClientButton />
</PermissionGuard>
```
