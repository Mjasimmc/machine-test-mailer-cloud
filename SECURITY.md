# Security Policy & Controls

> **Scope**: Vulnerability reporting, authentication mechanisms, authorization boundaries, tenant isolation, and threat model.  
> **Source of Truth**: Implementation across `apps/api/src/auth`, `apps/api/src/common/guards`, `apps/api/src/infrastructure/audit`, and `nginx/`.  
> **Last Verified**: 2026-09-25

---

## 1. Security Architecture & Controls

### 1.1 Authentication & Session Management
- **Password Security**: Passwords are hashed using `bcryptjs` with a work factor (salt rounds) of `10`.
- **Short-Lived Access Tokens**: Signed with `HS256` via `@nestjs/jwt`. Expiration is 15 minutes (`expiresIn: '15m'`). Arbitrary algorithms are strictly rejected.
- **Refresh Token Rotation**: Persistent 7-day refresh tokens stored as SHA-256 hashes in `refreshtokens`. Grouped into families; reuse of an old token triggers instant family revocation.
- **Session Revocation**: `tokenVersion` on `User` increments upon password change or `POST /auth/logout-all`, instantly invalidating tokens cluster-wide.
- **Secret Protection**: Passwords and `passwordHash` are stripped from all JSON serialization outputs via Mongoose schema `toJSON` transforms and redacted in audit logs.

### 1.2 Authorization & Multi-Tenant Isolation
- **Role-Based Access Control (RBAC)**: Supported roles are `Role.ADMIN` and `Role.USER`.
- **Fine-Grained Permissions**: Enforced via `PermissionsGuard` and `@RequirePermissions(Permission.XYZ)`.
- **Active User Enforcement (`ActiveUserGuard`)**: Verifies on every request that the user document in MongoDB has `status === 'ACTIVE'`. Suspended users receive an immediate `403 Forbidden` (`ACCOUNT_SUSPENDED`).
- **Server-Derived Tenant Identity**: Tenant context is resolved on the backend (`@CurrentTenant()`), never trusted from client-provided headers.
- **IDOR / BOLA Defense**: Resource access queries verify ownership (`form.userId.toString() === userId` or tenant mismatch) and return HTTP 403 Forbidden.

### 1.3 Real-Time Session Invalidation
- When an administrator suspends a user, the backend emits `user:suspended` across all API instances via the Redis Pub/Sub adapter.
- The server forcefully terminates open sockets (`server.in(room).disconnectSockets(true)`).
- The client `SocketProvider` purges tokens from `localStorage` and redirects to `/account-suspended`.

### 1.4 Runtime Protections
- **ReDoS Defense**: `safeRegexTest` checks nested quantifiers and input string bounds.
- **SSRF Protection**: `validateSafeUrl` verifies DNS resolutions, blocking private IP ranges (RFC 1918), loopback, and cloud metadata (`169.254.169.254`).
- **Container Least Privilege**: Docker containers execute as non-root `USER node`.
- **Network Segmentation**: MongoDB, Redis, and Vault are kept strictly internal to the private network.

---

## 2. Threat Model & Mitigation Matrix

| Threat / Attack Vector | Attack Surface | Implemented Mitigation | Residual Exposure |
|---|---|---|---|
| **Stale JWT Usage Post-Suspension** | API Endpoints | `ActiveUserGuard` checks user status on every authenticated request. | Database query overhead per request. |
| **Token Theft & Replay** | Refresh Flow | Refresh token rotation with reuse detection revokes entire family upon reuse. | Unauthenticated attacker using valid token before rotation. |
| **Cross-Tenant Access (IDOR/BOLA)**| Form / Submission CRUD | Server-derived tenant context and ownership validation returning HTTP 403. | Public forms are open by design via `publicId`. |
| **ReDoS Catastrophic Backtracking**| Public Submissions | `safeRegexTest` detects nested quantifiers and limits input length. | Valid complex regexes constrained by input bounds. |
| **Server-Side Request Forgery** | Webhook Dispatch | `validateSafeUrl` with DNS resolution blocks private IPs and metadata endpoints. | None. |
| **Public Form Spam / Flooding** | Public Submissions | Rate limiting at edge (Nginx 5r/s burst 20) + NestJS Throttler + payload size bounds (200 keys max). | Large distributed botnets require cloud edge WAF. |

---

## 3. Reporting Vulnerabilities

If you discover a security vulnerability in this repository, please send a private report to `security@saas.local` or open a private security advisory. Do not disclose security vulnerabilities publicly until an official fix has been released.
