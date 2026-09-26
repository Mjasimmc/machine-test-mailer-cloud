# SaaS Form Platform Monorepo

A production-grade, horizontally scalable, multi-tenant SaaS form-building and submission platform. Features a React 19 Single Page Application (Admin & User workspaces, Drag-and-Drop Form Builder, Form Preview, Submissions Data Table, and Public Form Runtime), a NestJS modular monolith REST API with Socket.IO real-time Redis scaling, HashiCorp Vault secrets management, MongoDB persistence, and an Nginx reverse proxy / edge load balancer.

---

## 1. Monorepo Structure

```text
/
├── apps/
│   ├── web/                 # React 19 + TypeScript + Vite frontend
│   └── api/                 # NestJS 11 + Mongoose backend REST API & WebSocket server
│
├── packages/
│   └── shared/              # Shared types, DTO interfaces, enums, AST schema definitions
│
├── docs/                    # Complete architectural, domain, security, and operational documentation
├── nginx/                   # Nginx reverse proxy, edge load balancer, and rate limiting rules
├── docker-compose.yml       # Production multi-container topology (edge, web, api-1, api-2, mongo, redis, vault, minio)
├── package.json             # Root workspace scripts (dev, build, lint, test, seed)
├── pnpm-workspace.yaml      # pnpm workspace configuration
├── AGENTS.md                # Engineering rules and directives for AI agents
├── ARCHITECTURE.md          # Complete production architecture and security hardening specification
├── CONTRIBUTING.md          # Contributor guide and PR workflow
└── SECURITY.md              # Security policies, authentication pipeline, and threat model
```

---

## 2. Quick Start

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **pnpm**: `>= 9.0.0`
- **MongoDB**: Running at `mongodb://127.0.0.1:27017/saas_db`
- **Redis** *(Optional for local dev, required for multi-node)*: Running at `redis://127.0.0.1:6379`

### Local Development Setup

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Seed Database**:
   ```bash
   pnpm seed
   ```
   *Seeded Credentials:*
   - **Administrator Account:**
     - Email: `admin@saas.local`
     - Password: `AdminPassword123!`
     - Role: `ADMIN`
   - **Sample User Accounts (Password: `UserPassword123!`):**
     - `alex.morgan@company.com` (Active)
     - `sarah.chen@techflow.io` (Active)
     - `david.kim@apexdesign.co` (Suspended)
     - `hannah.schmidt@berlinai.de` (Suspended)

3. **Start Development Server**:
   ```bash
   pnpm dev
   ```
   - **Frontend Application**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:3000](http://localhost:3000)

4. **Run Verification & Tests**:
   ```bash
   # Typecheck and lint across all workspace packages
   pnpm lint

   # Run automated Jest E2E test suites
   pnpm test

   # Full production build
   pnpm build
   ```

---

## 3. Production Multi-Container Orchestration

To run the complete production topology with edge load balancing, dual API instances, Redis pub/sub, MongoDB, Vault, and MinIO:

```bash
docker compose up --build -d
```

- **Edge Proxy / Application Ingress**: [http://localhost](http://localhost) (Port 80)
- **API Cluster**: `api-1:3000` & `api-2:3000` balanced via Nginx least-connections
- **Health Verification**: [http://localhost/health/readiness](http://localhost/health/readiness)

---

## 4. Key Architectural & Security Capabilities

### A. Authentication & Session Management
- **Short-Lived JWT & Refresh Rotation**: 15-minute access tokens signed with `HS256`, paired with 7-day rotating refresh tokens featuring replay reuse detection.
- **Immediate Session Revocation**: `tokenVersion` increments upon password change or `POST /auth/logout-all`, invalidating sessions cluster-wide.
- **Cross-Instance Realtime Revocation**: When an admin suspends a user account (`PATCH /admin/users/:id/suspend`), the backend broadcasts `user:suspended` across all API instances via the Redis Pub/Sub adapter and terminates open sockets immediately.

### B. Multi-Tenant Isolation & Fine-Grained Authorization
- **Server-Derived Tenant Identity**: Tenant context is resolved on the backend from authenticated tokens (`@CurrentTenant()`), never trusted from client headers.
- **Compound Database Scoping**: All queries hit compound indexes prefixed with `tenantId`. Cross-tenant reads and mutations return HTTP 403 Forbidden.
- **Granular RBAC**: Enforced via `PermissionsGuard` and `@RequirePermissions(Permission.XYZ)`.

### C. Form Builder & Deployment Lifecycle
- **Single Form / Single Mutable Draft**: Edits mutate `Form.draft` without impacting deployed releases.
- **Concurrency-Safe Atomic Deployment**: `POST /forms/:id/deploy` snapshots the draft into an immutable `FormVersion`. A retry loop handles concurrent deployment collisions without duplicate version creation.
- **Deterministic Strong ETag Caching**: Public forms emit SHA-256 content hashes, `Cache-Control: public, no-cache`, and `Last-Modified`, returning HTTP 304 on cache hits.

### D. Public Form Security & Anti-Abuse
- **Payload Limits**: Max 200 fields, 50KB strings, prototype pollution blocking.
- **ReDoS Defense**: `safeRegexTest` detects catastrophic backtracking nested quantifiers and bounds evaluated string lengths.
- **SSRF Defense**: Asynchronously dispatched webhooks validate targets via `validateSafeUrl`, blocking internal network IPs and cloud metadata (`169.254.169.254`).

---

## 5. Documentation Navigation

Detailed technical documentation is available in the [`docs/`](file:///home/sct/dd/multi-tenant-form-builder/docs/) directory:

- [Documentation Index](file:///home/sct/dd/multi-tenant-form-builder/docs/README.md)
- [System Architecture (ARCHITECTURE.md)](file:///home/sct/dd/multi-tenant-form-builder/ARCHITECTURE.md)
- [Canonical API Inventory](file:///home/sct/dd/multi-tenant-form-builder/docs/api/api-inventory.md)
- [Source of Truth Mapping](file:///home/sct/dd/multi-tenant-form-builder/docs/source-of-truth.md)
- [Security Architecture & Threat Model](file:///home/sct/dd/multi-tenant-form-builder/docs/security/security-architecture.md)
- [Architecture Risks & Technical Debt](file:///home/sct/dd/multi-tenant-form-builder/docs/risks/architecture-risks.md)
- [Security Gap & Control Matrix](file:///home/sct/dd/multi-tenant-form-builder/docs/risks/security-gaps.md)
- [Architecture Decision Records (ADRs)](file:///home/sct/dd/multi-tenant-form-builder/docs/decisions/README.md)
- [Database Schema Contracts](file:///home/sct/dd/multi-tenant-form-builder/docs/contracts/database.md)
