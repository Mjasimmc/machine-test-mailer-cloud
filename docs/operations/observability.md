# Operations: Observability & Audit Logging

> **Scope**: Application logging, audit logging, security event tracking, correlation IDs, and metrics.  
> **Source of Truth**: [`apps/api/src/infrastructure/observability/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/observability/) and [`apps/api/src/infrastructure/audit/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/audit/).  
> **Last Verified**: 2026-09-25

---

## 1. Log Categories & Separation

The platform strictly categorizes telemetry to prevent sensitive data pollution:

| Category | Storage / Stream | Purpose | Contents |
|---|---|---|---|
| **Application Logs** | `stdout` / JSON | Process diagnostics | Log levels, module context, request timing, correlation ID |
| **Security Audit Logs** | MongoDB `auditlogs` collection | Compliance & forensics | Actor, tenant, action, resource, result, IP, user-agent |
| **Access Logs** | Nginx `/var/log/nginx/access.log` | Edge telemetry | Request duration, upstream timing, status, IP, user-agent |

---

## 2. Security Audit Schema & Events

Every state-changing identity, authorization, form release, or moderation action is permanently logged to `AuditLog`:

```typescript
export interface AuditLogEntry {
  action: string;             // e.g. 'auth:login', 'form:deploy', 'user:suspended'
  actorId?: string;           // Calling user ID
  actorEmail?: string;
  tenantId?: string;          // Tenant context
  resource: string;           // Target entity: 'form', 'user', 'session'
  resourceId?: string;
  result: 'SUCCESS' | 'FAILURE';
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}
```

* **Sanitization Safeguard**: `AuditService` explicitly redacts sensitive keys (`password`, `token`, `secret`, `authorization`, `accessToken`, `refreshToken`) before persisting to MongoDB.
