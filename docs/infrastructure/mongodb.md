# Infrastructure: MongoDB Architecture & Data Store

> **Scope**: MongoDB database topology, connection pooling, compound indexing, multi-tenant scoping, and data integrity rules.  
> **Source of Truth**: Mongoose schemas in `apps/api/src/*/schemas/` and `docker-compose.yml`.  
> **Last Verified**: 2026-09-25

---

## 1. Database Topology & Role

MongoDB is the **sole authoritative database** for all persistent business entities:

```text
MongoDB Cluster
├── Primary Node (Read/Write)
├── Secondary Node 1 (Replication)
└── Secondary Node 2 (Replication / Failover)
```

* **Network Confinement**: Port `27017` is unmapped to the host in `docker-compose.yml` and accessible only via the private container overlay network.
* **ODM Framework**: NestJS Mongoose (`@nestjs/mongoose`) with strict schema validation.
* **Legacy Artifact**: [`apps/api/prisma/schema.prisma`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/prisma/schema.prisma) is an inactive legacy file and is **not connected** to any running code.

---

## 2. Collections, Tenant Scoping & Index Specifications

### A. Collection: `users`
* **Schema**: [`apps/api/src/users/schemas/user.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/users/schemas/user.schema.ts)
* **Fields**: `name`, `email`, `passwordHash`, `role`, `status`, `tenantId`, `permissions`, `tokenVersion`
* **Indexes**:
  * `{ email: 1 }` (unique, lowercase)
  * `{ tenantId: 1, email: 1 }`
  * `{ role: 1, status: 1 }`
  * `{ createdAt: -1 }`

### B. Collection: `forms`
* **Schema**: [`apps/api/src/forms/schemas/form.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/schemas/form.schema.ts)
* **Fields**: `name`, `userId`, `tenantId`, `publicId`, `deployedVersionId`, `draft`, `settings`, `deployments`, `activities`
* **Indexes**:
  * `{ publicId: 1 }` (unique)
  * `{ userId: 1 }`
  * `{ tenantId: 1, updatedAt: -1 }`

### C. Collection: `formversions`
* **Schema**: [`apps/api/src/forms/schemas/form-version.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/schemas/form-version.schema.ts)
* **Fields**: `formId`, `tenantId`, `versionNumber`, `title`, `elements`, `sections`, `formLayout`, `customCss`
* **Indexes**:
  * `{ formId: 1, versionNumber: 1 }` (unique compound index prevents version collisions)
  * `{ tenantId: 1, formId: 1, versionNumber: -1 }`
  * `{ formId: 1, createdAt: -1 }`

### D. Collection: `formsubmissions`
* **Schema**: [`apps/api/src/forms/schemas/form-submission.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/schemas/form-submission.schema.ts)
* **Fields**: `formId`, `tenantId`, `versionId`, `data`
* **Indexes**:
  * `{ formId: 1, createdAt: -1 }`
  * `{ tenantId: 1, formId: 1, createdAt: -1 }`
  * `{ tenantId: 1, formId: 1, versionId: 1 }`

### E. Collection: `refreshtokens`
* **Schema**: [`apps/api/src/identity/schemas/refresh-token.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/identity/schemas/refresh-token.schema.ts)
* **Fields**: `userId`, `tenantId`, `tokenHash`, `family`, `isRevoked`, `expiresAt`
* **Indexes**:
  * `{ tokenHash: 1 }` (unique)
  * `{ userId: 1, family: 1 }`
  * `{ expiresAt: 1 }` (TTL auto-cleanup)

### F. Collection: `auditlogs`
* **Schema**: [`apps/api/src/infrastructure/audit/audit-log.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/audit/audit-log.schema.ts)
* **Fields**: `action`, `actorId`, `tenantId`, `resource`, `resourceId`, `result`, `correlationId`, `details`
* **Indexes**:
  * `{ tenantId: 1, createdAt: -1 }`
  * `{ action: 1, createdAt: -1 }`

---

## 3. Scaling & Sharding Boundaries

* **Submissions Sharding Strategy**: For high-volume multi-tenant scaling, `formsubmissions` is the target collection for horizontal sharding using compound shard key `{ tenantId: 1, formId: 1 }`.
* **Connection Pooling**: Mongoose defaults maintain connection pool size 10–50 connections per API container.
