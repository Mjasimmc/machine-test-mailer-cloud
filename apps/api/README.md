# `@saas/api` — Backend REST API & WebSocket Server

> **What is this?**: NestJS 11 backend service providing HTTP REST endpoints and Socket.IO WebSocket broadcasting.  
> **What does it own?**: User authentication, admin moderation, form drafting, version release snapshotting, submissions intake, and real-time session invalidation.  
> **What does it depend on?**: `@saas/shared` (contract layer) and MongoDB (persistence layer).  
> **What depends on it?**: `apps/web` (via HTTP REST and Socket.IO).  

---

## 1. Directory Structure

```text
apps/api/
├── src/
│   ├── auth/                # Authentication controller, service, JWT strategy
│   ├── users/               # User management and profile endpoints
│   ├── forms/               # Form builder CRUD, drafting, deployments, submissions
│   │   ├── dto/             # Request validation DTOs
│   │   └── schemas/         # Mongoose schemas (Form, FormVersion, FormSubmission)
│   ├── admin/               # Platform moderation and dashboard statistics
│   ├── dashboard/           # Dashboard stats
│   ├── websocket/           # EventsGateway (Socket.IO server)
│   ├── common/              # Guards (JwtAuthGuard, ActiveUserGuard, RolesGuard)
│   ├── app.module.ts        # Root NestJS module
│   ├── main.ts              # Entry point bootstrap
│   └── seed.ts              # Database seeder script
│
├── test/                    # Jest E2E test suites
└── package.json             # API scripts and dependencies
```

---

## 2. Invariants & Rules
- All authenticated routes must use `@UseGuards(JwtAuthGuard, ActiveUserGuard)`.
- Resource mutations must verify ownership (`form.userId === req.user.id`).
- Form publishing creates immutable `FormVersion` snapshots without modifying active draft state.
