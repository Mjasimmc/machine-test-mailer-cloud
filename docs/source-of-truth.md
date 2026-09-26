# Source of Truth Mapping

> **Scope**: Authoritative mapping of architectural domains, schemas, controllers, and services to active repository code.  
> **Last Verified**: 2026-09-25

---

## 1. Domain & Implementation Mapping

| Domain / Concept | Authoritative Source of Truth | Secondary / Dependent Files | Notes |
|---|---|---|---|
| **Shared Contracts & Enums** | [`packages/shared/src/index.ts`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/index.ts) | `apps/api/src/**/*.dto.ts`, `apps/web/src/**/*.ts` | Defines `Role`, `UserStatus`, `Permission`, `UserDto`, `AuthResponse`, `SOCKET_EVENTS`. |
| **Form AST & Schema Types** | [`packages/shared/src/types/form.ts`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/types/form.ts) | `apps/web/src/features/forms/**`, `apps/api/src/forms/**` | Defines `FormElement`, `FormSection`, `FormZone`, `FormDto`, `FormVersionDto`. |
| **User Data Model** | [`apps/api/src/users/schemas/user.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/users/schemas/user.schema.ts) | `apps/api/src/seed.ts`, `apps/api/src/auth/` | Indexes: `{ email: 1 }`, `{ tenantId: 1, email: 1 }`. Strips `passwordHash`. |
| **Form Data Model** | [`apps/api/src/forms/schemas/form.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/schemas/form.schema.ts) | `apps/api/src/forms/forms.service.ts` | Stores mutable draft AST, settings, deployment history, activity logs. |
| **Form Version Model** | [`apps/api/src/forms/schemas/form-version.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/schemas/form-version.schema.ts) | `apps/api/src/forms/forms.service.ts` | Frozen immutable release snapshots. Unique index: `{ formId: 1, versionNumber: 1 }`. |
| **Form Submission Model** | [`apps/api/src/forms/schemas/form-submission.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/schemas/form-submission.schema.ts) | `apps/api/src/submissions/submissions.service.ts` | Polymorphic responses. Compound index: `{ tenantId: 1, formId: 1, createdAt: -1 }`. |
| **Refresh Token Model** | [`apps/api/src/identity/schemas/refresh-token.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/identity/schemas/refresh-token.schema.ts) | `apps/api/src/auth/auth.service.ts` | SHA-256 token hashes, family rotation chains, TTL expiration index. |
| **Security Audit Model** | [`apps/api/src/infrastructure/audit/audit-log.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/audit/audit-log.schema.ts) | `apps/api/src/infrastructure/audit/audit.service.ts` | Immutable security log entries indexed by `{ tenantId: 1, createdAt: -1 }`. |
| **Authentication Logic** | [`apps/api/src/auth/auth.service.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/auth/auth.service.ts) | `apps/api/src/auth/strategies/jwt.strategy.ts` | Bcrypt hashing, token issuance, refresh rotation, reuse detection. |
| **Authorization Guards** | [`apps/api/src/common/guards/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/common/guards/) | `apps/api/src/**/*.controller.ts` | `JwtAuthGuard`, `ActiveUserGuard`, `RolesGuard`, `PermissionsGuard`. |
| **Form Authoring Service** | [`apps/api/src/forms/forms.service.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/forms.service.ts) | `apps/api/src/forms/forms.controller.ts` | Single draft autosave, concurrency-safe atomic deployment releases, rollback. |
| **Public Form Runtime** | [`apps/api/src/runtime/runtime.service.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/runtime/runtime.service.ts) | `apps/api/src/runtime/public-runtime.controller.ts`| Immutable version delivery, SHA-256 strong ETag generation, draft isolation. |
| **Public Submission Service**| [`apps/api/src/submissions/submissions.service.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/submissions/submissions.service.ts) | `apps/api/src/submissions/submissions.controller.ts`| Anti-abuse payload validation, ReDoS safe regex check, multi-version projection. |
| **Administration Service** | [`apps/api/src/administration/admin.service.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/administration/admin.service.ts) | `apps/api/src/administration/admin.controller.ts` | Moderation, user suspension/unsuspension, cluster-wide socket termination. |
| **Real-Time Gateway** | [`apps/api/src/realtime/realtime.gateway.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/realtime/realtime.gateway.ts) | `apps/web/src/app/providers/SocketProvider.tsx` | Handshake JWT verification, room authorization, targeted suspension broadcast. |
| **Redis Cluster Adapter** | [`apps/api/src/realtime/redis-io.adapter.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/realtime/redis-io.adapter.ts) | `apps/api/src/main.ts` | Socket.IO Redis pub/sub adapter for cross-instance horizontal event broadcasting. |
| **Secrets Management** | [`apps/api/src/infrastructure/vault/secrets.service.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/vault/secrets.service.ts) | `apps/api/src/app.module.ts` | HashiCorp Vault KV v2 client with local development `.env` fallback. |
| **Asynchronous Queues** | [`apps/api/src/infrastructure/queue/queue.service.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/queue/queue.service.ts) | `apps/api/src/submissions/submissions.service.ts` | Decoupled background job processing for webhooks and heavy workloads. |
| **Object Storage Driver** | [`apps/api/src/infrastructure/storage/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/storage/) | `docker-compose.yml` | Local and S3/MinIO drivers for binary files and CSV exports. |
| **Client Routing & Auth** | [`apps/web/src/app/router/AppRouter.tsx`](file:///home/sct/dd/multi-tenant-form-builder/apps/web/src/app/router/AppRouter.tsx) | `apps/web/src/app/providers/AuthProvider.tsx` | Role-aware route guards (`AdminRoute`, `ProtectedRoute`, `PublicRoute`). |
| **Database Seeding** | [`apps/api/src/seed.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/seed.ts) | Root `package.json` | Seeds default Admin and sample active/suspended user accounts. |

---

## 2. Inactive / Dead Artifacts (Explicitly Not Sources of Truth)

* **[`apps/api/prisma/schema.prisma`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/prisma/schema.prisma)**: Legacy PostgreSQL Prisma definition. It is not imported, generated, or connected to any active application code. The sole active database engine is MongoDB via `@nestjs/mongoose`.
