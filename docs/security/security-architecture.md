# Security Architecture & Defense-in-Depth Model

> **Scope**: Defense-in-depth layers, identity verification, authorization guards, input validation, encryption, and audit logging.  
> **Source of Truth**: Implementation across `apps/api/src/common/guards/`, `apps/api/src/auth/`, `apps/api/src/infrastructure/audit/`, and `nginx/`.  
> **Last Verified**: 2026-09-25

---

## 1. Multi-Layer Defense-in-Depth Architecture

```text
Layer 1: Global Edge (Nginx / Cloud WAF)
         ├─ DDoS rate limiting (5r/s sensitive, 30r/s general)
         ├─ Security headers (nosniff, SAMEORIGIN, XSS, Referrer-Policy)
         └─ SSL/TLS termination & proxy header forwarding

Layer 2: Network & Container Boundary
         ├─ Non-root execution (USER node)
         ├─ Private Docker overlay network (saas-network)
         └─ MongoDB, Redis, and Vault zero host-port exposure

Layer 3: Application Gateway & Middlewares
         ├─ CorrelationMiddleware (X-Correlation-ID tracing)
         ├─ Helmet security headers
         └─ ThrottlerGuard (NestJS distributed/in-memory rate limiting)

Layer 4: Authentication & Session Verification
         ├─ Passport JwtStrategy (HS256 algorithm restriction)
         ├─ ActiveUserGuard (verifies user status === 'ACTIVE')
         ├─ Session revocation check (tokenVersion verification)
         └─ Refresh token rotation with reuse detection

Layer 5: Fine-Grained Authorization & Multi-Tenancy
         ├─ PermissionsGuard (enforces required Permission enum)
         ├─ Server-derived tenant context (@CurrentTenant())
         └─ Resource ownership validation (rejects IDOR/BOLA)

Layer 6: Input Sanitization & Runtime Protections
         ├─ Global ValidationPipe (whitelist: true, forbidNonWhitelisted: true)
         ├─ ReDoS mitigation (safeRegexTest)
         ├─ SSRF mitigation (validateSafeUrl for webhooks)
         └─ Submission payload limits (max 200 keys, 50KB strings, depth bound)

Layer 7: Data Protection & Forensics
         ├─ Mongoose toJSON transforms (strips passwordHash, __v)
         ├─ AuditLog collection (immutable security activity records)
         └─ Vault secrets management (KV v2 secrets boundary)
```
