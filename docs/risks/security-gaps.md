# Security Gap & Controls Registry

> **Scope**: Status of security controls across identity, access control, tenant isolation, runtime protection, network segmentation, and infrastructure.  
> **Source of Truth**: Implementation across `apps/api/`, `apps/web/`, `nginx/`, and `docker-compose.yml`.  
> **Last Verified**: 2026-09-25

---

## 1. Security Control Status Matrix

| Domain | Control Area | Status | Implemented Mechanism | Notes / Remaining Work |
|---|---|---|---|---|
| **Authentication** | Password Hashing | **Implemented** | Bcrypt with 10 salt rounds | Plaintext never saved or logged |
| **Authentication** | Access Token Lifetime | **Implemented** | Short-lived (15 minutes), algorithm-restricted (`HS256`) | Avoids long-lived token exposure |
| **Authentication** | Refresh Token Rotation | **Implemented** | Cryptographic random tokens (`rt_...`), SHA-256 hashed | Rotated on every use |
| **Authentication** | Refresh Reuse Detection | **Implemented** | Token families in `RefreshTokenSchema` | If revoked token used, whole family revoked |
| **Authentication** | Instant Session Revocation | **Implemented** | `tokenVersion` on `User` | Revokes all sessions on logout-all or password change |
| **Authorization** | Fine-Grained RBAC | **Implemented** | `Permission` enum & `PermissionsGuard` | Decorators `@RequirePermissions(...)` on all protected endpoints |
| **Tenant Isolation** | Server-Derived Context | **Implemented** | `@CurrentTenant()` decorator | Tenant ID resolved server-side from authenticated token |
| **Tenant Isolation** | Database Query Scoping | **Implemented** | Compound indexes `{ tenantId: 1, ... }` on all collections | All resource queries verify tenant/user ownership |
| **Tenant Isolation** | IDOR / BOLA Defense | **Implemented** | Ownership checks throw `ForbiddenException` (403) | Rejects cross-tenant access attempts |
| **Public Form Abuse** | Rate Limiting | **Implemented** | Nginx edge rate limit + NestJS Throttler | Throttled to 30 req/min at API, 20 burst at edge |
| **Public Form Abuse** | Payload Sanitization | **Implemented** | Max 200 keys, 50KB strings, prototype pollution block | Rejects malformed or oversized payloads |
| **Public Form Abuse** | ReDoS Defense | **Implemented** | `safeRegexTest` checks nested quantifiers and input bounds | Catastrophic backtracking eliminated |
| **SSRF** | Webhook URL Validation | **Implemented** | `validateSafeUrl` with DNS resolution | Blocks private IPs (RFC 1918), loopback, link-local, `169.254.169.254` |
| **Secrets** | Secret Management Boundary | **Implemented** | `SecretsService` with HashiCorp Vault integration | Fallback to `.env` in local development |
| **Secrets** | Secret Stripping | **Implemented** | `toJSON` transforms remove `passwordHash`, `__v` | Redacted in audit logs |
| **Database** | Public Access Prevention | **Implemented** | MongoDB port 27017 unexposed to host | Bound strictly to internal `saas-network` |
| **Database** | Replica Set Support | **Implemented** | `mongod --bind_ip_all` in Docker, replica set ready | Single node in compose, multi-node in prod topology |
| **Realtime** | WebSocket Room Authorization | **Implemented** | Handshake JWT verification, clients join only `user:` and `tenant:` | Arbitrary room subscription rejected |
| **Realtime** | Cross-Instance Revocation | **Implemented** | `@socket.io/redis-adapter` pub/sub | Broadcasts suspension and disconnects active sockets |
| **Containers** | Non-Root User | **Implemented** | `USER node` in `apps/api/Dockerfile` | Prevents container privilege escalation |
| **Containers** | Native Healthchecks | **Implemented** | `HEALTHCHECK` probing `/health/liveness` every 30s | Container orchestrator aware of liveness |
| **Network** | Network Segmentation | **Implemented** | Public zone (Nginx 80/443), private zone (`saas-network`) | DB, Redis, Vault not exposed to internet |
| **Caching** | Deterministic Strong ETag | **Implemented** | SHA-256 hash of immutable version snapshot | Emits `Cache-Control: public, no-cache`, `Last-Modified` |
| **Audit** | Security Audit Logging | **Implemented** | `AuditLog` collection & `AuditService` | Records actor, tenant, action, resource, correlation ID |
| **CI/CD** | Automated Pipeline | **Partial** | Monorepo linting (`pnpm lint`), tests (`pnpm test`), build | GitHub Actions CI workflow to be added for automated PR runs |
| **Storage** | Object Storage Abstraction | **Implemented** | `StorageService` with local and S3 drivers | MinIO configured in compose |
| **Disaster Recovery**| Backup & PITR Testing | **Partial** | MongoDB oplog compatible, restore procedures documented | Automated periodic restore testing to be scheduled |
| **Observability** | Distributed Tracing | **Partial** | Correlation IDs attached via `CorrelationMiddleware` | OpenTelemetry span export to Jaeger/Otel collector planned |
