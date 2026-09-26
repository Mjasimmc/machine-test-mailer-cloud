# Security: Multi-Tenant Isolation Architecture

> **Scope**: Tenant identity derivation, query scoping, storage path isolation, and IDOR/BOLA defense.  
> **Source of Truth**: Implementation across `apps/api/src/common/decorators/current-tenant.decorator.ts`, `apps/api/src/forms/`, and `apps/api/src/submissions/`.  
> **Last Verified**: 2026-09-25

---

## 1. Core Multi-Tenant Invariant

```text
Tenant context is ALWAYS derived server-side from the authenticated identity.
Clients are NEVER permitted to supply or spoof tenantId.
```

* **User as Tenant Fallback**: Each user has an explicit `tenantId`. If a user is not part of a separate enterprise workspace, their `tenantId` defaults to their own `_id.toString()`, ensuring that single users and multi-user organizations operate under identical isolation logic.

---

## 2. Prevention of Cross-Tenant Leakage

### A. Database Scoping & Compound Indexes
Every tenant-owned collection features compound indexes prefixed with `tenantId`:
* `users`: `{ tenantId: 1, email: 1 }`
* `forms`: `{ tenantId: 1, updatedAt: -1 }`
* `formversions`: `{ tenantId: 1, formId: 1, versionNumber: -1 }`
* `formsubmissions`: `{ tenantId: 1, formId: 1, createdAt: -1 }`
* `auditlogs`: `{ tenantId: 1, createdAt: -1 }`

### B. IDOR & BOLA Defense
When accessing forms or submission data by ID:
1. The database queries the document by `_id`.
2. The service verifies:
   ```typescript
   if (form.userId.toString() !== userId || (tenantId && form.tenantId && form.tenantId !== tenantId)) {
     throw new ForbiddenException('You do not have access to this form');
   }
   ```
3. If an authenticated user from Tenant B attempts to read or mutate a resource belonging to Tenant A, the request is immediately rejected with HTTP 403 Forbidden.

### C. Real-Time Room Scoping
* Sockets automatically join `tenant:${tenantId}` upon connection.
* Cross-tenant room subscriptions are blocked by `RealtimeGateway.handleSubscribeRoom`.

### D. Storage Path Confinement
* Object storage keys are partitioned under `tenants/{tenantId}/...`.
