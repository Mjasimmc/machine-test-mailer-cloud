# Contracts: Database Schema & Collections

> **Scope**: MongoDB collection definitions, Mongoose schemas, compound indexes, and lifecycle hooks.  
> **Source of Truth**: Mongoose schemas in `apps/api/src/*/schemas/`.  
> **Last Verified**: 2026-09-25

---

## 1. Collection Specifications

### Collection: `users`
- **Schema**: [`apps/api/src/users/schemas/user.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/users/schemas/user.schema.ts)
- **Fields**: `name`, `email`, `passwordHash`, `role`, `status`, `tenantId`, `permissions`, `tokenVersion`
- **Indexes**:
  - `{ email: 1 }` (unique, lowercase)
  - `{ tenantId: 1, email: 1 }`
  - `{ role: 1, status: 1 }`
  - `{ createdAt: -1 }`
- **Serialization**: `toJSON` strips `passwordHash`, `__v`, maps `_id` $\to$ `id`.

---

### Collection: `forms`
- **Schema**: [`apps/api/src/forms/schemas/form.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/schemas/form.schema.ts)
- **Fields**: `name`, `userId`, `tenantId`, `publicId`, `deployedVersionId`, `draft`, `settings`, `deployments`, `activities`
- **Indexes**:
  - `{ publicId: 1 }` (unique)
  - `{ userId: 1 }`
  - `{ tenantId: 1, updatedAt: -1 }`

---

### Collection: `formversions`
- **Schema**: [`apps/api/src/forms/schemas/form-version.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/schemas/form-version.schema.ts)
- **Fields**: `formId`, `tenantId`, `versionNumber`, `title`, `elements`, `sections`, `formLayout`, `customCss`
- **Indexes**:
  - `{ formId: 1, versionNumber: 1 }` (unique compound index)
  - `{ tenantId: 1, formId: 1, versionNumber: -1 }`
  - `{ formId: 1, createdAt: -1 }`

---

### Collection: `formsubmissions`
- **Schema**: [`apps/api/src/forms/schemas/form-submission.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/schemas/form-submission.schema.ts)
- **Fields**: `formId`, `tenantId`, `versionId`, `data`
- **Indexes**:
  - `{ formId: 1, createdAt: -1 }`
  - `{ tenantId: 1, formId: 1, createdAt: -1 }`
  - `{ tenantId: 1, formId: 1, versionId: 1 }`

---

### Collection: `refreshtokens`
- **Schema**: [`apps/api/src/identity/schemas/refresh-token.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/identity/schemas/refresh-token.schema.ts)
- **Fields**: `userId`, `tenantId`, `tokenHash`, `family`, `isRevoked`, `expiresAt`
- **Indexes**:
  - `{ tokenHash: 1 }` (unique)
  - `{ userId: 1, family: 1 }`
  - `{ expiresAt: 1 }` (TTL index)

---

### Collection: `auditlogs`
- **Schema**: [`apps/api/src/infrastructure/audit/audit-log.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/audit/audit-log.schema.ts)
- **Fields**: `action`, `actorId`, `tenantId`, `resource`, `resourceId`, `result`, `correlationId`, `details`
- **Indexes**:
  - `{ tenantId: 1, createdAt: -1 }`
  - `{ action: 1, createdAt: -1 }`
