# Documentation Hub

Welcome to the technical documentation repository for the SaaS Form Platform Monorepo. This documentation is organized into clear architectural, domain, engineering, security, and operational areas representing the verified latest implementation.

---

## Navigation & Structure

```text
docs/
├── source-of-truth.md           # Authoritative mapping of domains and contracts to code files
├── architecture-risks.md        # Technical debt and architectural risk registry
│
├── api/                         # Canonical API specifications
│   └── api-inventory.md         # Complete endpoint directory, DTOs, and rate limits
│
├── architecture/                # System topology and runtime specifications
│   ├── system.md                # System component boundaries and modular monolith topology
│   ├── runtime.md               # Process execution, ports, and inter-process communication
│   ├── data-flow.md             # End-to-end data flows (drafting, deploy, submissions)
│   ├── dependencies.md          # Internal and external dependency tree
│   ├── scalability.md           # Concurrency model, indexes, and horizontal scaling
│   └── security.md              # Defense-in-depth pipeline and security perimeters
│
├── security/                    # Security architecture and threat analysis
│   ├── security-architecture.md # Defense-in-depth layers and pipeline
│   ├── authentication.md        # Short-lived JWT, refresh rotation, and session revocation
│   ├── authorization.md         # Fine-grained RBAC, permissions, and guard pipeline
│   ├── tenant-isolation.md      # Server-derived tenant context and BOLA/IDOR prevention
│   ├── threat-model.md          # Attack vectors and implemented mitigation matrix
│   ├── security-controls.md     # Measurable security controls and verification suites
│   └── vulnerability-management.md # Vulnerability detection and disclosure lifecycle
│
├── infrastructure/              # Infrastructure service boundaries
│   ├── cdn.md                   # Edge CDN, strong ETag evaluation, and caching
│   ├── redis.md                 # Redis Socket.IO adapter, distributed state, and queues
│   ├── vault.md                 # HashiCorp Vault secrets boundary and lease handling
│   ├── mongodb.md               # MongoDB topology, collections, and compound indexes
│   ├── queues.md                # Asynchronous queue workers and webhook dispatch
│   ├── object-storage.md        # S3 / MinIO storage drivers and tenant isolation
│   └── networking.md            # Network zones, segmentation, and ingress load balancing
│
├── operations/                  # Deployment, environment, and operations
│   ├── deployment.md            # Production build and multi-container deployment
│   ├── environments.md          # Environment variables and configuration options
│   ├── observability.md         # Structured JSON logging, correlation IDs, and audit logs
│   ├── monitoring.md            # Automated liveness and readiness health probes
│   ├── backups.md               # Backup policies and Point-in-Time Recovery (PITR)
│   └── disaster-recovery.md     # RPO/RTO targets, component failover, and restore testing
│
├── domains/                     # Business domain specifications
│   ├── identity-authentication.md # User identity, roles, and credential management
│   ├── form-builder-drafting.md # Hierarchical canvas, element AST, and draft saving
│   ├── form-deployment-versioning.md # Concurrency-safe release snapshotting and version history
│   ├── form-submissions-analytics.md # Public submissions intake, queries, and CSV exports
│   ├── administration-moderation.md # Admin moderation, metrics, and user suspension
│   └── realtime-events.md       # Real-time WebSocket events and Redis cluster fanout
│
├── contracts/                   # Canonical boundary contracts
│   ├── api.md                   # REST API endpoints, DTOs, and error codes
│   ├── database.md              # MongoDB collections, Mongoose schemas, and indexes
│   ├── events.md                # WebSocket Socket.IO event contracts
│   └── integrations.md          # External service boundaries and adapters
│
├── decisions/                   # Architecture Decision Records (ADRs)
│   ├── README.md                # ADR Index and decision log
│   ├── ADR-001-pnpm-monorepo.md # pnpm workspace monorepo selection
│   ├── ADR-002-mongodb-primary-datastore.md # MongoDB and Mongoose primary document store
│   ├── ADR-003-jwt-stateless-auth-with-active-guard.md # JWT with ActiveUserGuard validation
│   ├── ADR-004-realtime-session-revocation-websocket.md # Socket.IO targeted room revocation
│   ├── ADR-005-single-draft-immutable-version-deployment.md # Single draft + immutable version release
│   ├── ADR-006-decoupled-form-runtimes.md # Decoupled editor and public form renderers
│   ├── ADR-007-redis-pubsub-adapter-scaling.md # Redis Pub/Sub adapter for horizontal scaling
│   ├── ADR-008-hashicorp-vault-secret-boundary.md # HashiCorp Vault secrets boundary
│   ├── ADR-009-deterministic-etag-and-edge-caching.md # Deterministic strong ETag and edge caching
│   ├── ADR-010-server-derived-tenant-isolation.md # Server-derived multi-tenant isolation
│   ├── ADR-011-refresh-token-family-rotation-and-versioning.md # Short-lived access & refresh rotation
│   └── ADR-012-asynchronous-queue-and-ssrf-mitigation.md # Async queueing and SSRF protection
│
├── risks/                       # Risk and gap registries
│   ├── architecture-risks.md    # Architecture risk registry and technical debt
│   └── security-gaps.md         # Security control status and gap matrix
│
└── development/                 # Local developer guides
    ├── setup.md                 # Initial machine setup and prerequisites
    ├── local-development.md     # Running dev servers and hot-reloading
    ├── testing.md               # Executing Jest E2E tests
    └── troubleshooting.md       # Common setup errors and remedies
```
