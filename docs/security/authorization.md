# Security: Authorization & Permissions (RBAC)

> **Scope**: Roles, fine-grained permissions, guard execution pipeline, and multi-tenant resource authorization.  
> **Source of Truth**: [`apps/api/src/common/guards/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/common/guards/) and [`packages/shared/src/index.ts`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/index.ts).  
> **Last Verified**: 2026-09-25

---

## 1. Authorization Hierarchy

Authorization flows strictly from authenticated identity down to individual action:

```text
Authenticated Identity (req.user)
        ↓
Server-Derived Tenant Context (@CurrentTenant())
        ↓
Role (Role.ADMIN | Role.USER)
        ↓
Fine-Grained Permissions (Permission enum)
        ↓
Resource Ownership (form.userId === userId || form.tenantId === tenantId)
        ↓
Permitted Action (Controller Handler Execution)
```

---

## 2. Implemented Permission Enum

```typescript
export enum Permission {
  FORMS_READ = 'forms:read',
  FORMS_CREATE = 'forms:create',
  FORMS_UPDATE = 'forms:update',
  FORMS_DEPLOY = 'forms:deploy',
  FORMS_ROLLBACK = 'forms:rollback',
  SUBMISSIONS_READ = 'submissions:read',
  SUBMISSIONS_EXPORT = 'submissions:export',
  USERS_READ = 'users:read',
  USERS_SUSPEND = 'users:suspend',
  USERS_MANAGE = 'users:manage',
}
```

* **Default User Permissions**: `forms:read`, `forms:create`, `forms:update`, `forms:deploy`, `forms:rollback`, `submissions:read`, `submissions:export`, `users:read`.
* **Default Admin Permissions**: All permissions (including `users:suspend` and `users:manage`).

---

## 3. Guard Execution Pipeline

1. **`JwtAuthGuard`**: Validates bearer token signature, expiration, and algorithm (`HS256`).
2. **`ActiveUserGuard`**: Verifies `user.status === 'ACTIVE'`. Throws HTTP 403 Forbidden with `code: 'ACCOUNT_SUSPENDED'` if suspended.
3. **`RolesGuard`**: Checks `@Roles(...)` metadata for role-level restrictions (e.g. `@Roles(Role.ADMIN)`).
4. **`PermissionsGuard`**: Evaluates `@RequirePermissions(...)` against `req.user.permissions`.
5. **Service Ownership Checks**: Validates that target resources belong to the caller's tenant/userId. Throws HTTP 403 Forbidden on IDOR/BOLA attempts.
