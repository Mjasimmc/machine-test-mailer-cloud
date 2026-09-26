# Documentation Audit & Source-of-Truth Matrix

> **Scope**: Repository-wide documentation synchronization, architectural audit, and implementation alignment matrix.  
> **Source of Truth**: `apps/api/`, `apps/web/`, `packages/shared/`, `nginx/`, `docker-compose.yml`, and root configuration.  
> **Last Verified**: 2026-09-25  
> **Verification Status**: 100% Synchronized

---

## 1. Documentation Source-of-Truth Matrix

| Documentation Area | Implementation Source | Implemented State | Verified File(s) |
|---|---|---|---|
| **System Architecture** | `docker-compose.yml`, `nginx/nginx.conf`, NestJS modules | Modular monolith behind Nginx reverse proxy, multi-container compose topology | `docs/architecture/system.md`, `ARCHITECTURE.md` |
| **Domain Architecture** | `apps/api/src/` (Auth, Users, Forms, Submissions, Admin, Realtime) | 6 business domains with clean separation and DTO contracts | `docs/domains/`, `docs/architecture/domain-architecture.md` |
| **Frontend Architecture** | `apps/web/src/` (React 19, Vite 6, SCSS tokens) | Decoupled Form Canvas and Public Form View, Auth & Socket providers | `docs/engineering/frontend.md`, `apps/web/README.md` |
| **Authentication** | `apps/api/src/auth/` (JWT + Refresh rotation) | Short-lived access JWT (15m), refresh tokens with reuse detection & family revocation, instant invalidation via `tokenVersion` | `docs/security/authentication.md`, `docs/domains/identity-authentication.md` |
| **Authorization** | `apps/api/src/common/guards/` (`RolesGuard`, `PermissionsGuard`) | RBAC (`ADMIN`, `USER`) + fine-grained permissions (`forms:*`, `submissions:*`, `users:*`) | `docs/security/authorization.md` |
| **Tenant Isolation** | `apps/api/src/common/decorators/current-tenant.decorator.ts`, Mongoose compound indexes | Server-derived `tenantId`, strict tenant scoping on queries/mutations, isolated WebSocket rooms | `docs/security/tenant-isolation.md` |
| **Form Lifecycle** | `apps/api/src/forms/forms.service.ts` | Single Form, Single Continuous Mutable Draft (`Form.draft`), autosave via `PATCH /forms/:id/draft` | `docs/domains/form-builder-drafting.md` |
| **Version Lifecycle** | `apps/api/src/forms/schemas/form-version.schema.ts` | Immutable snapshot releases (`FormVersion`), atomic deployment retry on `E11000`, rollback support | `docs/domains/form-deployment-versioning.md` |
| **Submission Lifecycle** | `apps/api/src/submissions/submissions.service.ts` | Public intake, bounds checking (200 keys, 50KB strings), dynamic data table projection, CSV export | `docs/domains/form-submissions-analytics.md` |
| **Runtime** | `apps/web/src/features/forms/public/PublicFormView.tsx` | Decoupled client runtime rendering AST elements, client-side validation | `docs/decisions/ADR-006-decoupled-form-runtimes.md` |
| **Realtime** | `apps/api/src/websocket/events.gateway.ts` | Socket.IO with Redis Pub/Sub adapter (`@socket.io/redis-adapter`), scoped rooms (`user:*`, `tenant:*`), instant session termination | `docs/domains/realtime-events.md`, `docs/decisions/ADR-007-redis-pubsub-websocket-adapter.md` |
| **Cache** | `nginx/nginx.conf`, `apps/api/src/submissions/submissions.controller.ts` | Deterministic SHA-256 ETag, HTTP 304 handling, `Cache-Control: public, no-cache`, Nginx static asset caching | `docs/infrastructure/cdn.md`, `docs/decisions/ADR-009-deterministic-etag-caching.md` |
| **Vault** | `apps/api/src/vault/vault.service.ts` | HashiCorp Vault AppRole authentication (`VAULT_ROLE_ID`, `VAULT_SECRET_ID`) with safe environment variable fallback | `docs/infrastructure/vault.md`, `docs/decisions/ADR-008-hashicorp-vault-secret-management.md` |
| **Database** | `apps/api/src/*/schemas/` (Mongoose 8 + MongoDB 7) | Document store, multi-tenant compound indexes, schema validation | `docs/infrastructure/mongodb.md`, `docs/decisions/ADR-002-mongodb-primary-datastore.md` |
| **Redis** | `apps/api/src/websocket/`, `ioredis` | Redis 7 for Socket.IO multi-node clustering adapter and Pub/Sub | `docs/infrastructure/redis.md` |
| **Queue** | `apps/api/src/queue/queue.service.ts` | Asynchronous worker queue for background tasks (webhook dispatch, email, audit) with retry & backoff | `docs/infrastructure/queues.md`, `docs/decisions/ADR-012-asynchronous-queue-and-ssrf-protection.md` |
| **Storage** | `apps/api/src/storage/storage.service.ts` | Storage abstraction supporting local disk and AWS S3 / MinIO object storage | `docs/infrastructure/object-storage.md` |
| **Security** | Guards, helmet, rate-limiting, SSRF & ReDoS filters | Defense-in-depth: SSRF protection (`validateSafeUrl`), ReDoS safe regex (`safeRegexTest`), payload limits, non-root Docker (`USER node`) | `SECURITY.md`, `docs/security/` |
| **Observability** | `apps/api/src/health/`, `apps/api/src/audit/` | Liveness/readiness probes (`/health/live`, `/health/ready`), structured MongoDB audit logs (`auditlogs` collection) | `docs/operations/observability.md`, `docs/operations/monitoring.md` |
| **Deployment** | `docker-compose.yml`, Dockerfiles, `nginx/nginx.conf` | Multi-container compose (Nginx reverse proxy, API replicas, Web SPA, MongoDB, Redis, MinIO, Vault) | `docs/operations/deployment.md`, `docs/operations/environments.md` |
| **Disaster Recovery** | MongoDB dump/restore scripts, backup policies | RPO/RTO targets, point-in-time recovery strategy, credential restoration | `docs/operations/backups.md`, `docs/operations/disaster-recovery.md` |
| **Testing** | `apps/api/test/` (4 Jest E2E suites) | 4 automated E2E test suites (`app`, `forms`, `websocket`, `infrastructure`) executed via `pnpm test` | `docs/engineering/testing.md` |

---

## 2. Inactive & Dead Artifact Audit

| Artifact | Location | Nature | Active Status | Resolution |
|---|---|---|---|---|
| **Prisma Schema** | `apps/api/prisma/schema.prisma` | PostgreSQL relational schema | **DEAD ARTIFACT** | Inactive legacy file. MongoDB via `@nestjs/mongoose` is the sole datastore. Documented in `source-of-truth.md` and `ADR-002`. |

---

## 3. Contradictions & Historical Discrepancies Resolved

1. **Database Source of Truth**:
   - *Conflict*: `apps/api/prisma/` suggested PostgreSQL with Prisma ORM.
   - *Resolution*: Audited all service files in `apps/api/src`. Confirmed that zero files import Prisma or PostgreSQL drivers. MongoDB via Mongoose is the sole active database. Documented `schema.prisma` as an inactive legacy artifact.
2. **WebSocket Scalability**:
   - *Conflict*: Historical documentation noted that WebSockets were limited to a single node in-memory.
   - *Resolution*: Implemented `@socket.io/redis-adapter` with `ioredis`. Documented horizontal multi-node scaling across backend replicas in `ADR-007` and `docs/infrastructure/redis.md`.
3. **ETag Implementation**:
   - *Conflict*: Historical notes referred to weak validators (`W/`).
   - *Resolution*: Implemented deterministic SHA-256 strong ETags (`"${sha256(content)}"`) on public form endpoints with HTTP 304 Not Modified validation in `apps/api/src/submissions/submissions.controller.ts`.
4. **Public Form Controller Separation**:
   - *Conflict*: Early documentation placed public endpoints in `PublicFormsController` or `FormsService`.
   - *Resolution*: Verified `SubmissionsController` (`/public/forms/:publicId`, `/public/forms/:publicId/submissions`) and `SubmissionsService` handle public intake, and updated all contracts and route inventories accordingly.
5. **Multi-Tenancy & Authorization**:
   - *Conflict*: Earlier documentation lacked explicit tenant scoping and fine-grained permissions.
   - *Resolution*: Implemented server-derived `tenantId`, `@RequirePermissions(...)`, `PermissionsGuard`, and documented the complete identity and tenant resolution pipeline in `docs/security/tenant-isolation.md`.
6. **Path Formatting**:
   - *Conflict*: Documentation contained hardcoded Windows file URLs (`file:///c:/Users/...`).
   - *Resolution*: Replaced all instances across the repository with clean, portable relative markdown links and standard workspace paths.
