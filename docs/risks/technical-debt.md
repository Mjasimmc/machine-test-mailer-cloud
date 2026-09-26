# Technical Debt Registry

> **Scope**: Tracked technical debt items, priority, impact, and planned resolution.  
> **Source of Truth**: Implementation across `apps/api/`, `apps/web/`, and `infrastructure/`.  
> **Last Verified**: 2026-09-25

---

## 1. Technical Debt Items

| Debt ID | Title | Category | Priority | Impact | Planned Resolution |
|---|---|---|---|---|---|
| **DEBT-001** | Redis user session caching | Performance | P2 | Frequent DB queries in `JwtStrategy` | Cache active user status & `tokenVersion` in Redis with 30s TTL |
| **DEBT-002** | Remove inactive `apps/api/prisma/` | Hygiene | P3 | Developer confusion | Remove legacy Prisma directory in a dedicated cleanup commit |
| **DEBT-003** | Distributed Tracing with OpenTelemetry | Observability | P2 | Tracing currently relies on correlation IDs | Integrate OpenTelemetry SDK and export spans to Jaeger/Otel collector |
| **DEBT-004** | Dedicated BullMQ worker container | Scalability | P2 | Queue executes in-process if Redis worker isn't split | Spin up dedicated worker container in production |
| **DEBT-005** | Automated PITR Restore Verification | Operations | P2 | Restore tests currently executed manually | Automate monthly restore tests in an isolated sandbox database |
