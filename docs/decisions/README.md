# Architecture Decision Records (ADRs)

> **Scope**: Index of significant architectural, technical, and security decisions.  
> **Last Verified**: 2026-09-25

---

## Index of Decisions

| ADR ID | Title | Status | Primary Impact Area |
|---|---|---|---|
| [ADR-001](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-001-pnpm-monorepo.md) | pnpm Workspace Monorepo Architecture | Accepted | Repository Structure & Code Sharing |
| [ADR-002](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-002-mongodb-primary-datastore.md) | MongoDB & Mongoose as Primary Datastore | Accepted | Database & Schema Polymorphism |
| [ADR-003](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-003-jwt-stateless-auth-with-active-guard.md) | JWT Authentication with DB Active Guard | Accepted | Authentication & Security |
| [ADR-004](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-004-realtime-session-revocation-websocket.md) | Real-Time Session Revocation via WebSockets | Accepted | Real-time & Moderation |
| [ADR-005](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-005-single-draft-immutable-version-deployment.md) | Single Form / Single Draft / Immutable Versioning | Accepted | Form Lifecycle & Data Integrity |
| [ADR-006](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-006-decoupled-form-runtimes.md) | Decoupled Form Editor and Public Runtimes | Accepted | Frontend Architecture & Rendering |
| [ADR-007](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-007-redis-pubsub-adapter-scaling.md) | Redis Pub/Sub Adapter for Horizontal Real-Time Scaling | Accepted | Scalability & Realtime |
| [ADR-008](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-008-hashicorp-vault-secret-boundary.md) | HashiCorp Vault Secrets Management Boundary | Accepted | Security & Secrets Management |
| [ADR-009](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-009-deterministic-etag-and-edge-caching.md) | Deterministic Strong ETag and Edge Caching | Accepted | Performance & Caching |
| [ADR-010](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-010-server-derived-tenant-isolation.md) | Server-Derived Multi-Tenant Context & Query Scoping | Accepted | Multi-Tenancy & Authorization |
| [ADR-011](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-011-refresh-token-family-rotation-and-versioning.md) | Short-Lived Access Tokens & Refresh Rotation | Accepted | Authentication & Session Security |
| [ADR-012](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/ADR-012-asynchronous-queue-and-ssrf-mitigation.md) | Asynchronous Queueing & SSRF Protection | Accepted | Asynchronous Workloads & Network Security |
