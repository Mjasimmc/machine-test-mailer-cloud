# Architecture Risks & Technical Debt Registry

> **Scope**: Verified architectural risks, scalability constraints, and technical debt tracking.  
> **Source of Truth**: Implementation across `apps/api/`, `apps/web/`, `nginx/`, and `docker-compose.yml`.  
> **Last Verified**: 2026-09-25

---

## 1. Architectural Risk Registry

### RISK-001: In-Memory WebSocket State across Scaled API Instances
* **Category**: Real-Time Scaling & Concurrency
* **Severity**: High (was Critical)
* **Status**: **MITIGATED**
* **Current State**: Socket.IO now uses the Redis pub/sub adapter (`RedisIoAdapter` via `@socket.io/redis-adapter`) to broadcast events across clustered API instances.
* **Evidence**: [`apps/api/src/realtime/redis-io.adapter.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/realtime/redis-io.adapter.ts) connects `pubClient` and `subClient` to `REDIS_URL` and attaches to the NestJS Socket.IO gateway in [`main.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/main.ts).
* **Impact**: Admin actions (such as user suspension) now propagate across all nodes and disconnect targeted user sockets.
* **Likelihood**: Low
* **Current Mitigation**: Redis Pub/Sub adapter enabled with automatic in-memory fallback for local development.
* **Remaining Risk**: If Redis becomes unavailable, Socket.IO gracefully degrades to single-node in-memory broadcasting.
* **Recommended Action**: Monitor Redis connectivity in production and configure Redis Sentinel or AWS ElastiCache multi-AZ.
* **Owner**: Backend Engineering

---

### RISK-002: Per-Request Database Lookup in ActiveUserGuard & JwtStrategy
* **Category**: Database Performance & High Traffic Load
* **Severity**: Medium
* **Status**: **ACCEPTED**
* **Current State**: Authenticated requests query MongoDB via `UsersService.findById` in `JwtStrategy` to verify user existence, `tokenVersion`, and active status.
* **Evidence**: [`apps/api/src/auth/strategies/jwt.strategy.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/auth/strategies/jwt.strategy.ts).
* **Impact**: Ensures immediate session invalidation when an account is suspended or `tokenVersion` increments, but introduces database read load under high request rates.
* **Likelihood**: Medium
* **Current Mitigation**: Primary key `_id` index in MongoDB ensures sub-millisecond query execution.
* **Remaining Risk**: Peak traffic could increase MongoDB CPU usage.
* **Recommended Action**: Implement a short-lived Redis cache (e.g. 15–30s TTL) for active user state or use Redis pub/sub for targeted invalidation keys.
* **Owner**: Backend Engineering

---

### RISK-003: Public Submission Burst Saturation
* **Category**: Scalability & Availability
* **Severity**: Medium
* **Status**: **MITIGATED**
* **Current State**: Public submissions (`POST /public/forms/:publicId/submissions`) write to MongoDB and asynchronously dispatch heavy notifications via `QueueService`. Edge rate limiting in Nginx throttles abusive spikes.
* **Evidence**: [`apps/api/src/submissions/submissions.service.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/submissions/submissions.service.ts) and [`nginx/nginx.conf`](file:///home/sct/dd/multi-tenant-form-builder/nginx/nginx.conf) (zone `api_sensitive:10m rate=5r/s burst=20`).
* **Impact**: Submissions are validated against payload limits (max 200 fields, 50KB strings) and ReDoS-safe regex patterns before database writes.
* **Likelihood**: Low
* **Current Mitigation**: Edge Nginx rate limiting, NestJS Throttler guard, payload sanitization, and async webhook dispatch.
* **Remaining Risk**: Massive distributed botnets could bypass single-IP rate limits without a cloud WAF (Cloudflare/AWS WAF).
* **Recommended Action**: Place Cloudflare or AWS WAF in front of public submission routes in production.
* **Owner**: Infrastructure / DevOps

---

### RISK-004: Legacy Unused Prisma Schema
* **Category**: Codebase Clarity & Hygiene
* **Severity**: Low
* **Status**: **OBSOLETE** / Documented
* **Current State**: [`apps/api/prisma/schema.prisma`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/prisma/schema.prisma) is an inactive artifact not referenced by any build, script, or runtime code.
* **Evidence**: Prisma client is not imported in `apps/api/src`. MongoDB via `@nestjs/mongoose` is the sole datastore.
* **Impact**: Minimal runtime risk; potential developer confusion.
* **Likelihood**: Low
* **Current Mitigation**: Explicitly documented in `AGENTS.md`, `ARCHITECTURE.md`, and `docs/source-of-truth.md`.
* **Recommended Action**: Archive or delete `apps/api/prisma/` directory in a dedicated cleanup PR.
* **Owner**: Backend Engineering

---

### RISK-005: Form Deployment Concurrency Collisions
* **Category**: Data Integrity & Versioning
* **Severity**: Medium
* **Status**: **MITIGATED**
* **Current State**: Simultaneous deployment requests on the same form could collide when calculating `nextVersionNumber`.
* **Evidence**: [`FormsService.deployDraft`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/forms.service.ts) enforces a compound unique index `{ formId: 1, versionNumber: 1 }` and executes an atomic retry loop catching `E11000` duplicate key errors.
* **Impact**: Zero version collision or corruption occurs under concurrent release requests.
* **Likelihood**: Low
* **Current Mitigation**: Unique compound index and automatic retry loop (up to 3 attempts).
* **Remaining Risk**: Extremely high concurrency (>3 simultaneous deploys for the same form) could return 409 Conflict.
* **Recommended Action**: User interface already debounces deployment buttons and displays loading spinners.
* **Owner**: Backend Engineering

---

## 2. Technical Debt Registry

| Debt ID | Item | Category | Priority | Planned Resolution |
|---|---|---|---|---|
| **DEBT-001** | Redis user session caching | Performance | P2 | Cache user `isActive` and `tokenVersion` in Redis with 30s TTL to reduce MongoDB read pressure |
| **DEBT-002** | Remove inactive `apps/api/prisma/` | Hygiene | P3 | Delete unused Prisma directory to prevent developer confusion |
| **DEBT-003** | Distributed Tracing with OpenTelemetry | Observability | P2 | Integrate OpenTelemetry SDK for end-to-end tracing across HTTP, MongoDB, and Redis |
| **DEBT-004** | BullMQ queue worker process | Scaling | P2 | Extract `QueueService` into dedicated background worker container when job volume increases |
