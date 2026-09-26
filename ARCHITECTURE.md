# Scalable Production Architecture & Enterprise Security Hardening

> **Scope**: Horizontally scalable modular monolith topology, multi-tenant isolation, fine-grained RBAC, hardened authentication & token rotation, concurrency control, SSRF & ReDoS mitigation, deterministic caching, audit logging, real-time scaling, Vault secret management, container security, and disaster recovery.  
> **Source of Truth**: Implementation across `apps/api`, `apps/web`, `packages/shared`, `nginx/`, and `docker-compose.yml`.  
> **Last Verified**: 2026-09-25

---

## 1. System Topology & Network Segmentation

The platform is engineered as a defense-in-depth, horizontally scalable SaaS modular monolith designed to support high concurrent user traffic and public form submission spikes under strict multi-tenant boundaries.

```text
                              INTERNET
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ GLOBAL EDGE LAYER       │
                    │ DNS + CDN + WAF + DDoS  │
                    │ Rate Limiting + TLS     │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ LOAD BALANCER (Nginx)   │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
              API-1            API-2            API-N
           (Port 3000)      (Port 3000)      (Port 3000)
                │                │                │
                └────────────────┼────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
      Identity                Domains                Realtime
    (Auth, Users)         (Forms, Runtime)      (Socket.IO + Redis)
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
       ┌─────────────────────────┼──────────────────────────┐
       ▼                         ▼                          ▼
    MongoDB                    Redis                      Queue
  Replica Set              Distributed State                │
(Internal Port 27017)    (Internal Port 6379)               ▼
       │                         │                       Workers
       │                         │
       └─────────────────────────┼─────────────────────────┐
                                 │                         │
                               Vault                  Object Storage
                         Secrets Management        (MinIO / S3 / Local)
                        (Internal Port 8200)       (Internal Port 9000)
```

### Network Zones & Ingress Rules:
* **PUBLIC ZONE**: CDN, Edge WAF, and Reverse Proxy / Load Balancer (`edge-lb`). Only ports 80/443 are exposed externally.
* **APPLICATION ZONE**: Horizontally scaled API nodes (`api-1`, `api-2`, `api-N`) communicating through private container network `saas-network`.
* **DATA & SECURITY ZONE**: MongoDB, Redis, HashiCorp Vault, and MinIO. **Zero host port mappings exist** for these stateful databases; all traffic is strictly internal to the private overlay network.

---

## 2. Multi-Tenant Isolation Model

Tenant context is strictly **derived server-side** from the authenticated user token or form identity. The platform **never trusts client-supplied `tenantId`**.

```text
Client Request
      ↓
JWT Bearer Token / Public Form ID
      ↓
JwtStrategy / Form Lookup (Authoritative Server Resolution)
      ↓
req.user.tenantId (Server-Derived Tenant Context)
      ↓
Role & Permissions Check
      ↓
Resource Ownership / Tenant Query Scoping
      ↓
Database / Storage Operation
```

### Tenant Invariants:
1. **User Identity & Tenant Binding**: Every user document stores `tenantId` (defaulting to the primary user ID if not provisioned under an enterprise workspace).
2. **Compound Index Scoping**:
   * `UserSchema`: `{ tenantId: 1, email: 1 }`
   * `FormSchema`: `{ tenantId: 1, updatedAt: -1 }`
   * `FormVersionSchema`: `{ tenantId: 1, formId: 1, versionNumber: -1 }`
   * `FormSubmissionSchema`: `{ tenantId: 1, formId: 1, createdAt: -1 }`
3. **IDOR & BOLA Prevention**:
   * Direct object access queries verify that the target resource belongs to the calling user's tenant:
     ```typescript
     if (form.userId.toString() !== userId || (tenantId && form.tenantId && form.tenantId !== tenantId)) {
       throw new ForbiddenException('You do not have access to this form');
     }
     ```
   * Attackers cannot read, modify, or export forms or submissions belonging to other tenants.

---

## 3. Fine-Grained Authorization (RBAC & Permissions)

Authorization extends beyond coarse role checks into fine-grained permissions defined in `@saas/shared`:

```typescript
export enum Permission {
  FORMS_READ = 'forms:read',
  FORMS_CREATE = 'forms:create',
  FORMS_UPDATE = 'forms:update',
  FORMS_DEPLOY = 'forms:deploy',
  FORMS_ROLLBACK = 'forms:rollback',
  SUBMISSIONS_READ = 'submissions:read',
  SUBMISSIONS_EXPORT = 'submissions:export',
  USERS_READ = 'users:read',
  USERS_SUSPEND = 'users:suspend',
  USERS_MANAGE = 'users:manage',
}
```

* **Guard Hierarchy**: Routes are decorated with `@UseGuards(JwtAuthGuard, ActiveUserGuard, PermissionsGuard)` and `@RequirePermissions(Permission.FORMS_...)`.
* **Privilege Escalation Prevention**: `PermissionsGuard` verifies that `req.user.permissions` contains all necessary permissions for the requested endpoint. Administrators default to all permissions; standard users default to workspace resource permissions.

---

## 4. Hardened Authentication & Token Lifecycle

```text
Authentication Flow:
1. Login (POST /auth/login)
   ├─ Validates credentials with bcrypt (10 rounds)
   ├─ Verifies user.status === ACTIVE
   ├─ Generates short-lived Access Token (15m, HS256, strictly restricted algorithm)
   └─ Generates Refresh Token (7 days) tied to a cryptographically random Family ID

2. Token Refresh (POST /auth/refresh)
   ├─ Hashes presented token (SHA-256) and queries RefreshToken collection
   ├─ Reuse Detection: If token is already marked isRevoked=true:
   │    └─ Revokes the ENTIRE token family (compromised session mitigation)
   ├─ Atomically marks current token as revoked
   └─ Issues new Access Token and rotated Refresh Token in the same Family

3. Immediate Session Revocation:
   ├─ User Schema tracks `tokenVersion: number`
   ├─ Logout All (POST /auth/logout-all) / Password Change increments tokenVersion
   └─ JwtStrategy rejects any token where `payload.tokenVersion < user.tokenVersion`
```

---

## 5. Form & Deployment Concurrency Control

The platform strictly preserves the **Single Form / Single Mutable Draft / Immutable Released Versions** invariant:

```text
Form
│
├── Current Draft (Form.draft)
│      └── Single mutable AST, updated via PATCH /forms/:id/draft
│
└── Immutable Versions (FormVersion collection)
       ├── V1 (Frozen release snapshot)
       ├── V2 (Frozen release snapshot)
       └── VN (Frozen release snapshot)
```

### Atomic Deployment & Concurrency Retry:
To prevent race conditions when multiple deployment requests are executed simultaneously:
1. `FormsService.deployDraft` evaluates `nextVersionNumber = latestVersion.versionNumber + 1`.
2. A compound unique index `{ formId: 1, versionNumber: 1 }` prevents duplicate version numbers.
3. If concurrent requests collide, MongoDB throws error `E11000`; the deployment service catches this and executes an atomic retry loop up to 3 times to allocate the next incremental version safely.
4. Historical versions are strictly immutable. Rollback/reactivation (`POST /forms/:id/versions/:versionId/deploy`) simply updates `form.deployedVersionId` without mutating historical `FormVersion` records.

---

## 6. Public Form Security, Anti-Abuse & ReDoS Mitigation

Anonymous public form access and submission are hardened against common abuse vectors:

1. **Payload & Resource Limits**:
   * Maximum 200 top-level field keys per submission.
   * Maximum 50,000 characters per text field.
   * Nested depth limits and prototype pollution blocking (`__proto__`, `constructor`, `prototype`).
2. **Safe Regex Evaluation (ReDoS Defense)**:
   * Public submission fields validated via user-defined regex rules pass through `safeRegexTest`:
     - Blocks nested quantifiers prone to exponential catastrophic backtracking (e.g. `(a+)+`, `(x*)*`).
     - Limits maximum pattern length to 250 characters and evaluated input string length to 5,000 characters.
3. **SSRF Protection on Webhooks**:
   * When users configure webhook notifications (`form.settings.webhookUrl`), `validateSafeUrl` performs DNS resolution:
     - Disallows non-HTTP/HTTPS protocols.
     - Disallows private IPv4 ranges (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
     - Disallows loopback (`127.0.0.0/8`) and link-local cloud metadata endpoints (`169.254.169.254`).

---

## 7. Deterministic Caching & Edge Architecture

* **Deterministic Strong ETag**: For public form version delivery, `RuntimeService` calculates a SHA-256 content hash of the deployed immutable version snapshot (`"${sha256(versionId + versionNumber + updatedAt)}"`).
* **Caching Headers**: Public forms emit `Cache-Control: public, no-cache` and `Last-Modified`.
* **Bandwidth Offloading**: When browsers or CDNs present `If-None-Match: <etag>` or `If-Modified-Since`, the API immediately returns `304 Not Modified`.
* **Zero Private Data Leakage**: Authenticated tenant data, user profiles, drafts, and administrative endpoints never emit public cache headers and include `no-store, no-cache` safeguards.

---

## 8. Dedicated Security Audit Architecture

Every critical security and data lifecycle operation writes an immutable record to the `AuditLog` collection via `AuditService`:

```text
Audit Event Schema:
├── action: 'auth:login' | 'auth:refresh' | 'form:created' | 'form:deploy' | 'user:suspended' ...
├── actorId: string
├── tenantId: string
├── resource: 'form' | 'form_version' | 'user' | 'submission'
├── resourceId: string
├── result: 'SUCCESS' | 'FAILURE'
├── correlationId: string
├── ipAddress / userAgent
└── details: sanitized payload (passwords, tokens, and secrets explicitly redacted)
```

Audit logs are indexed by `{ tenantId: 1, createdAt: -1 }` and `{ action: 1, createdAt: -1 }` for SIEM ingestion and security forensics.

---

## 9. Real-Time WebSocket Scaling & Room Authorization

* **Redis Pub/Sub Adapter**: `RedisIoAdapter` links Socket.IO instances across the cluster using Redis, ensuring seamless event broadcasting across horizontal API nodes.
* **Strict Room Authorization**:
  - Connections authenticate via JWT with algorithm verification (`HS256`).
  - Active status and `tokenVersion` are validated on handshake.
  - Clients are automatically placed in `user:${userId}` and `tenant:${tenantId}`.
  - Arbitrary room subscription is blocked; any attempt by an unauthorized client to subscribe to external rooms is rejected.
* **Instant Session Revocation**: When an admin suspends a user, `emitUserSuspended(userId)` broadcasts to the user's room and forcefully disconnects all active sockets cluster-wide.

---

## 10. Canonical API Inventory

| Path | Method | Auth Required | Role / Permission | Description |
|---|---|---|---|---|
| `/health` | GET | No | Public | Liveness probe (HTTP 200) |
| `/health/readiness` | GET | No | Public | Database & Redis connectivity probe |
| `/auth/register` | POST | No | Public | User registration with initial active status |
| `/auth/login` | POST | No | Public | Credentials verification, issues Access & Refresh tokens |
| `/auth/refresh` | POST | No | Public | Rotates Refresh Token with reuse detection |
| `/auth/logout` | POST | No | Public | Revokes presented refresh token |
| `/auth/logout-all` | POST | Yes | Authenticated | Increments tokenVersion, revoking all active sessions |
| `/auth/change-password`| POST | Yes | Authenticated | Verifies old password, updates hash, revokes sessions |
| `/users/me` | GET | Yes | Authenticated | Returns authenticated user profile and permissions |
| `/forms` | POST | Yes | `forms:create` | Creates a new form with initial mutable draft |
| `/forms` | GET | Yes | `forms:read` | Lists all forms scoped to calling tenant/user |
| `/forms/:id` | GET | Yes | `forms:read` | Returns form details, draft AST, and release history |
| `/forms/:id/draft` | PATCH | Yes | `forms:update` | Updates the mutable single draft |
| `/forms/:id/deploy` | POST | Yes | `forms:deploy` | Concurrency-safe atomic release of current draft |
| `/forms/:id/settings`| PATCH | Yes | `forms:update` | Updates form settings with SSRF-safe webhook validation |
| `/forms/:id/versions/:vId/deploy` | POST | Yes | `forms:deploy` | Re-activates historical immutable version |
| `/forms/:id/data` | GET | Yes | `submissions:read`| Master submission data matrix aggregated across all versions |
| `/public/forms/:publicId` | GET | No | Public | Serves immutable public form schema with strong ETag |
| `/public/forms/:publicId/submissions` | POST | No | Public | Validates & records submission against deployed version |
| `/admin/users` | GET | Yes | Admin (`users:read`) | Lists users across tenants with search filtering |
| `/admin/users/:id` | GET | Yes | Admin (`users:read`) | Retrieves detailed user profile |
| `/admin/users/:id/suspend` | PATCH | Yes | Admin (`users:suspend`) | Suspends account, revokes sessions, broadcasts via WS |
| `/admin/users/:id/unsuspend` | PATCH | Yes | Admin (`users:suspend`) | Restores account to active status |
| `/admin/dashboard/stats` | GET | Yes | Admin | Platform-wide metrics (users, forms, submissions) |

---

## 11. Container Hardening & Disaster Recovery

* **Container Least Privilege**: All API application containers execute under non-root user `USER node`.
* **Private Network Confinement**: Database ports (27017, 6379, 8200) are omitted from host port bindings and accessible only within Docker's bridge network.
* **Automated Healthchecks**: Native container health probes monitor `/health/liveness` every 30 seconds.
* **Disaster Recovery Strategy**:
  - Authoritative data resides exclusively in MongoDB; Point-in-Time Recovery (PITR) enabled via replica set oplog archiving.
  - Redis contains transient distributed state; failure causes graceful degradation without business data loss.
