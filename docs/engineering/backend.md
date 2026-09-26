# Engineering: Backend Architecture

> **Scope**: NestJS modular organization, dependency injection, service patterns, and MongoDB integration.  
> **Source of Truth**: `apps/api/src/`.  
> **Last Verified**: 2026-09-25

---

## 1. Modular Organization

```text
apps/api/src/
├── app.module.ts                # Root module configuring MongooseModule, Vault, Redis, Rate Limiting
├── auth/                        # AuthController, AuthService, JwtStrategy, RefreshTokenSchema
├── users/                       # UsersController, UsersService, UserSchema
├── forms/                       # FormsController, FormsService, Form & FormVersion Schemas
├── submissions/                 # SubmissionsController, SubmissionsService, FormSubmissionSchema
├── admin/                       # AdminController, AdminService
├── dashboard/                   # DashboardController, DashboardService
├── websocket/                   # EventsGateway, EventsModule (Redis Adapter enabled)
├── audit/                       # AuditService, AuditLogSchema
├── queue/                       # QueueService, QueueModule (background worker jobs)
├── storage/                     # StorageService, StorageModule (Local/S3/MinIO drivers)
├── vault/                       # VaultService, VaultModule (HashiCorp Vault / Env fallback)
├── health/                      # HealthController, HealthModule (Liveness/Readiness probes)
└── common/                      # Guards (JwtAuth, ActiveUser, Roles, Permissions), Decorators, Interceptors
```

---

## 2. Dependency Injection & Service Layer

- Modules declare controllers and providers cleanly.
- Services inject Mongoose models using `@InjectModel(SchemaName.name)`.
- Global `ValidationPipe` transforms and validates plain request JSON into strongly typed DTO instances.
- Tenant context is automatically extracted from the authenticated user via `@CurrentTenant()` decorator.
- Centralized `AuditService` logs administrative and security-critical actions asynchronously.
