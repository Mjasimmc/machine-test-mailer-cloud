# Architecture: Security Boundaries & Defense Pipeline

> **Scope**: Security perimeters, authentication, authorization, multi-tenant isolation, and input defenses.  
> **Source of Truth**: Implementation across `apps/api/src/common/guards/`, `apps/api/src/auth/`, and `nginx/`.  
> **Last Verified**: 2026-09-25

---

## 1. Security Perimeters

```text
External Requests
       │
       ▼
[ Edge Nginx Rate Limiter ]  (Zone rate limits: 5r/s sensitive, 30r/s general)
       │
       ▼
[ CorrelationMiddleware ]    (Assigns X-Correlation-ID for audit tracking)
       │
       ▼
[ Helmet Middleware ]        (nosniff, SAMEORIGIN, XSS filters, CSP)
       │
       ▼
[ NestJS ThrottlerGuard ]    (Application-layer DDoS protection)
       │
       ▼
[ JwtAuthGuard & Strategy ]  (Algorithm restriction: HS256, 15m expiration, tokenVersion check)
       │
       ▼
[ ActiveUserGuard ]          (Ensures user status is ACTIVE; rejects suspended users with 403)
       │
       ▼
[ PermissionsGuard ]         (Evaluates @RequirePermissions against req.user.permissions)
       │
       ▼
[ Tenant & Ownership Check ] (Enforces tenant and user resource ownership; blocks IDOR/BOLA)
       │
       ▼
[ Domain Service & DB ]      (Mongoose strict schemas, safe regex testing, SSRF validation)
```

---

## 2. Invariants & Controls

* **Zero Trust of Client Tenant Identity**: The server derives tenant context solely from the authenticated JWT token or authoritative form record.
* **Safe Regex Execution**: Public submissions pass regex evaluation through `safeRegexTest` to prevent CPU exhaustion via ReDoS.
* **SSRF Guard**: Webhook notification targets are pre-validated by `validateSafeUrl` with DNS resolution to block access to internal infrastructure and cloud metadata.
* **Immutable Audit Logging**: Sensitive operations write unalterable event records to `AuditLog`.
