# Infrastructure: Object Storage & Asset Management

> **Scope**: Storage provider abstraction, local storage driver, S3/MinIO driver, signed URLs, and tenant isolation.  
> **Source of Truth**: [`apps/api/src/infrastructure/storage/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/storage/) and [`docker-compose.yml`](file:///home/sct/dd/multi-tenant-form-builder/docker-compose.yml).  
> **Last Verified**: 2026-09-25

---

## 1. Storage Architecture

Binary assets, large CSV exports, and file uploads are abstracted away from database documents via `StorageService`:

```text
Application Services
        │
        ▼
   StorageService (Provider Interface)
   ├── LocalStorageDriver (Local disk uploads/ directory)
   └── S3StorageDriver (AWS S3 / MinIO / Cloudflare R2)
```

---

## 2. Implemented Drivers

1. **`LocalStorageDriver`**:
   * Saves files to disk path `uploads/`.
   * Sanitizes filenames and isolates paths per tenant: `uploads/{tenantId}/{fileId}`.
   * Suitable for local development and single-node testing.
2. **`S3StorageDriver`**:
   * Uses S3 API compatible with MinIO, AWS S3, and Cloudflare R2.
   * Key pattern: `tenants/{tenantId}/forms/{formId}/{fileKey}`.
   * Upload credentials (`S3_ACCESS_KEY`, `S3_SECRET_KEY`) reside exclusively in Vault.

---

## 3. Tenant Isolation & Access Control

* **Path Confinement**: All storage keys are prefixed by `tenantId` to prevent cross-tenant directory traversal.
* **Controlled Access**: Raw storage credentials are **never exposed to the frontend**.
* **Pre-signed URLs**: In production S3 mode, time-limited signed URLs (e.g. 15-minute expiration) are generated for downloading or uploading artifacts.
