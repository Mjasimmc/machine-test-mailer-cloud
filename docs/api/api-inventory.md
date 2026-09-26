# Canonical API Inventory & Endpoint Specifications

> **Scope**: Complete inventory of all REST endpoints and WebSocket events implemented in `apps/api/src/`.  
> **Source of Truth**: NestJS Controllers and Gateway implementations.  
> **Last Verified**: 2026-09-25

---

## 1. Public APIs (Unauthenticated)

### `POST /auth/register`
* **Purpose**: Provisions a new user account.
* **Authentication**: None (Public)
* **Tenant Scope**: Generates new tenant context (`tenantId = user._id.toString()`).
* **Permission**: None
* **Request DTO**: [`RegisterDto`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/index.ts) (`{ name: string, email: string, password: string }`)
* **Response DTO**: [`AuthResponse`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/index.ts) (`{ accessToken: string, refreshToken: string, user: UserDto }`)
* **Validation**: `@IsNotEmpty()`, `@IsEmail()`, `@MinLength(8)`, `@MaxLength(100)`
* **Rate Limiting**: Throttler (default 300r/m), Nginx sensitive zone (rate=5r/s, burst=10)
* **Audit Logging**: Emits `auth:register` event with user ID and email.
* **Failure Behavior**: HTTP 409 Conflict if email already exists; HTTP 400 on malformed input.

---

### `POST /auth/login`
* **Purpose**: Authenticates credentials and returns access & refresh tokens.
* **Authentication**: None (Public)
* **Tenant Scope**: Resolved from user document.
* **Permission**: None
* **Request DTO**: [`LoginDto`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/index.ts) (`{ email: string, password: string }`)
* **Response DTO**: [`AuthResponse`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/index.ts) (`{ accessToken: string, refreshToken: string, user: UserDto }`)
* **Validation**: `@IsEmail()`, `@IsNotEmpty()`, `@IsString()`
* **Rate Limiting**: Throttler, Nginx sensitive zone (rate=5r/s, burst=10)
* **Audit Logging**: Emits `auth:login` (SUCCESS) or `auth:login_failed` / `auth:login_suspended` (FAILURE).
* **Failure Behavior**: HTTP 401 Unauthorized on invalid credentials; HTTP 403 Forbidden with `code: 'ACCOUNT_SUSPENDED'` if suspended.

---

### `POST /auth/refresh`
* **Purpose**: Rotates refresh token and issues a new short-lived access token.
* **Authentication**: None (Public via Refresh Token body)
* **Tenant Scope**: Resolved from valid refresh token record.
* **Permission**: None
* **Request DTO**: [`RefreshTokenDto`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/index.ts) (`{ refreshToken: string }`)
* **Response DTO**: `{ accessToken: string, refreshToken: string }`
* **Validation**: `@IsNotEmpty()`, `@IsString()`
* **Rate Limiting**: Nginx sensitive zone (rate=5r/s, burst=10)
* **Security Controls**: Token family tracking. If an already-revoked token is presented, the entire family is immediately revoked to neutralize token reuse attacks.
* **Audit Logging**: Emits `auth:refresh` (SUCCESS) or `auth:refresh_reuse_detected` (FAILURE).
* **Failure Behavior**: HTTP 401 Unauthorized if token invalid or expired.

---

### `POST /auth/logout`
* **Purpose**: Revokes the supplied refresh token.
* **Authentication**: None (Public via Refresh Token body)
* **Request DTO**: [`RefreshTokenDto`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/index.ts) (`{ refreshToken: string }`)
* **Response**: `{ message: 'Logged out successfully' }`
* **Audit Logging**: Emits `auth:logout`.

---

### `GET /public/forms/:publicId`
* **Purpose**: Fetches the immutable active deployed schema for public form rendering.
* **Authentication**: None (Public)
* **Tenant Scope**: Form-bound
* **Permission**: None
* **Request Param**: `publicId: string` (e.g. `f_abc123`)
* **Response DTO**: [`PublicFormDto`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/types/form.ts)
* **Caching**: Emits strong deterministic ETag (SHA-256 hash of immutable version), `Cache-Control: public, no-cache`, `Last-Modified`.
* **Conditional Requests**: Returns HTTP 304 Not Modified when `If-None-Match` or `If-Modified-Since` matches.
* **Rate Limiting**: Throttler (120r/m), Nginx general zone (rate=30r/s, burst=50)
* **Draft Isolation**: Never reads or exposes `Form.draft`. Returns `{ isDeployed: false }` if undeployed.

---

### `POST /public/forms/:publicId/submissions`
* **Purpose**: Submits response data against the form's active deployed version.
* **Authentication**: None (Public)
* **Tenant Scope**: Inherited from target form.
* **Request Body**: [`SubmitFormDto`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/dto/submit-form.dto.ts) (`{ data: Record<string, any> }`)
* **Response**: `{ message: 'Submission received successfully', id: string }`
* **Validation**:
  - Checks `form.settings.isAcceptingSubmissions !== false` and `submissionLimit`.
  - Enforces payload bounds: max 200 field keys, 50,000 max string length, array item limits, prototype pollution check.
  - Required field check against deployed schema.
  - ReDoS-safe regex evaluation (`safeRegexTest`).
* **Rate Limiting**: Throttler (30r/m), Nginx sensitive zone (rate=5r/s, burst=20)
* **Async Side Effects**: Dispatches webhook notification asynchronously via `QueueService`.
* **Failure Behavior**: HTTP 400 Bad Request on validation failure; HTTP 404 if form not found.

---

## 2. Health & Diagnostic APIs

### `GET /health` / `GET /health/liveness`
* **Purpose**: Kubernetes/Docker container liveness probe.
* **Authentication**: None
* **Response**: `{ status: 'ok', uptime: number, timestamp: string }` (HTTP 200)

### `GET /health/readiness`
* **Purpose**: Validates database and infrastructure dependencies.
* **Authentication**: None
* **Response**: HTTP 200 with service health breakdown if MongoDB is connected (`state === 1`). Returns HTTP 503 Service Unavailable if primary datastore is unreachable.

---

## 3. Authenticated User APIs

All endpoints below require `@UseGuards(JwtAuthGuard, ActiveUserGuard)` and bearer token.

### `GET /users/me`
* **Purpose**: Retrieves authenticated user profile, permissions, and tenant context.
* **Response**: `UserDto` (`{ id, name, email, role, status, tenantId, permissions, createdAt }`)

### `PATCH /users/me`
* **Purpose**: Updates profile information (name, email).
* **Request Body**: `{ name?: string, email?: string }`
* **Response**: `UserDto`

### `POST /auth/change-password`
* **Purpose**: Changes user password, hashes new password, and increments `tokenVersion` to revoke all active sessions.
* **Request Body**: [`ChangePasswordDto`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/index.ts) (`{ currentPassword: string, newPassword: string }`)
* **Response**: `{ message: string }`
* **Audit Logging**: Emits `auth:password_changed`.

### `POST /auth/logout-all`
* **Purpose**: Revokes all existing sessions across all devices for the calling user.
* **Response**: `{ message: 'Logged out of all sessions successfully' }`
* **Audit Logging**: Emits `auth:logout_all`.

---

## 4. Forms & Workspace APIs

All endpoints below require `@UseGuards(JwtAuthGuard, ActiveUserGuard, PermissionsGuard)` and enforce tenant isolation.

### `POST /forms`
* **Permission**: `forms:create`
* **Request Body**: `{ name: string }`
* **Response**: `FormDto` with initialized editable single draft.
* **Audit Logging**: Emits `form:created`.

### `GET /forms`
* **Permission**: `forms:read`
* **Response**: `FormDto[]` scoped strictly to calling user's tenant.

### `GET /forms/:id`
* **Permission**: `forms:read`
* **Response**: `FormDto` containing metadata, draft AST, settings, deployment history, and activity logs.
* **Ownership / Tenant Check**: Throws HTTP 403 Forbidden if form belongs to another user or tenant.

### `PATCH /forms/:id/draft`
* **Permission**: `forms:update`
* **Request Body**: `UpdateDraftDto` (`{ title?, elements?, sections?, formLayout?, customCss? }`)
* **Response**: Updated `FormDto`. Modifies mutable draft without affecting deployed versions.

### `POST /forms/:id/deploy`
* **Permission**: `forms:deploy`
* **Purpose**: Freezes current draft into immutable `FormVersion` and marks it active.
* **Concurrency Guard**: Atomic retry loop on MongoDB `E11000` prevents version number collisions.
* **Audit Logging**: Emits `form:deploy` with allocated `versionNumber`.

### `PATCH /forms/:id/settings`
* **Permission**: `forms:update`
* **Request Body**: `UpdateSettingsDto`
* **SSRF Guard**: Validates `webhookUrl` with DNS resolution blocking private/cloud metadata IPs.
* **Audit Logging**: Emits `form:settings_updated`.

### `POST /forms/:id/versions/:versionId/deploy`
* **Permission**: `forms:deploy`
* **Purpose**: Rollback / re-activation of an existing historical immutable version.
* **Audit Logging**: Emits `form:rollback`.

### `GET /forms/:id/data`
* **Permission**: `submissions:read`
* **Response**: `FormDataViewDto` containing cumulative column definitions across all versions and submission rows.
* **Export**: `GET /forms/:id/data?format=csv` generates RFC 4180 CSV attachment stream.

---

## 5. Administration APIs

All endpoints require `@UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard, PermissionsGuard)` and `@Roles(Role.ADMIN)`.

### `GET /admin/users`
* **Permission**: `users:read`
* **Query Params**: `?search=string`
* **Response**: `UserDto[]`

### `GET /admin/users/:id`
* **Permission**: `users:read`
* **Response**: `UserDto`

### `PATCH /admin/users/:id/suspend`
* **Permission**: `users:suspend`
* **Purpose**: Sets user status to `SUSPENDED`.
* **Realtime Effect**: Emits `user:suspended` via Redis adapter and forcefully disconnects all active sockets for that user.
* **Audit Logging**: Emits `user:suspended`.

### `PATCH /admin/users/:id/unsuspend`
* **Permission**: `users:suspend`
* **Purpose**: Restores user status to `ACTIVE`.
* **Audit Logging**: Emits `user:unsuspended`.

### `GET /admin/dashboard/stats`
* **Purpose**: Returns aggregate statistics (`totalUsers`, `activeUsers`, `suspendedUsers`).

---

## 6. Real-Time WebSocket Events (Socket.IO)

* **Gateway URL**: `/socket.io/`
* **Handshake Authentication**: `auth: { token: string }` or `headers: { authorization: 'Bearer ...' }`
* **Algorithm Restriction**: Handshake validates JWT algorithm `HS256`.
* **Active Status & Token Version Check**: Rejects connection if user is suspended or presented token version is revoked.
* **Authorized Rooms**: Client automatically joins `user:${userId}` and `tenant:${tenantId}`.
* **Arbitrary Room Join Protection**: `@SubscribeMessage('subscribe_room')` verifies caller belongs to requested room; unauthorized room joins are blocked.
* **Server-Emitted Event: `user:suspended`**:
  - Target: Room `user:${userId}`
  - Payload: `{ userId: string, message: string }`
  - Action: Client purges tokens and redirects to `/account-suspended`; server disconnects socket.
