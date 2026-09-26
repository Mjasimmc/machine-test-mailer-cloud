# Contracts: REST API Specification

> **Scope**: Complete list of endpoints, HTTP methods, request/response structures, and authentication requirements.  
> **Source of Truth**: NestJS Controllers in `apps/api/src/`.  
> **Last Verified**: 2026-09-25

---

## 1. Authentication & Users

### `POST /auth/register`
- **Access**: Public
- **Request Body**: `{ name: string, email: string, password: string }`
- **Response**: `{ accessToken: string, refreshToken: string, user: UserDto }`

### `POST /auth/login`
- **Access**: Public
- **Request Body**: `{ email: string, password: string }`
- **Response**: `{ accessToken: string, refreshToken: string, user: UserDto }`

### `POST /auth/refresh`
- **Access**: Public
- **Request Body**: `{ refreshToken: string }`
- **Response**: `{ accessToken: string, refreshToken: string }`

### `POST /auth/logout`
- **Access**: Public
- **Request Body**: `{ refreshToken: string }`
- **Response**: `{ message: string }`

### `POST /auth/logout-all`
- **Access**: Authenticated (`Bearer Token`, Active User)
- **Response**: `{ message: string }`

### `POST /auth/change-password`
- **Access**: Authenticated (`Bearer Token`, Active User)
- **Request Body**: `{ currentPassword: string, newPassword: string }`
- **Response**: `{ message: string }`

### `GET /users/me`
- **Access**: Authenticated (`Bearer Token`, Active User)
- **Response**: `UserDto`

### `PATCH /users/me`
- **Access**: Authenticated (`Bearer Token`, Active User)
- **Request Body**: `{ name?: string, email?: string }`
- **Response**: `UserDto`

---

## 2. Health & Diagnostics

### `GET /health` / `GET /health/liveness`
- **Access**: Public
- **Response**: `{ status: 'ok', uptime: number, timestamp: string }`

### `GET /health/readiness`
- **Access**: Public
- **Response**: HTTP 200 `{ status: 'ready', ... }` if MongoDB is connected; HTTP 503 if unreachable.

---

## 3. Administration

### `GET /admin/dashboard/stats`
- **Access**: Admin (`Role.ADMIN`)
- **Response**: `{ totalUsers: number, activeUsers: number, suspendedUsers: number }`

### `GET /admin/users`
- **Access**: Admin (`Role.ADMIN`, `users:read`)
- **Query Params**: `?search=string`
- **Response**: `UserDto[]`

### `GET /admin/users/:id`
- **Access**: Admin (`Role.ADMIN`, `users:read`)
- **Response**: `UserDto`

### `PATCH /admin/users/:id/suspend`
- **Access**: Admin (`Role.ADMIN`, `users:suspend`)
- **Response**: `UserDto`

### `PATCH /admin/users/:id/unsuspend`
- **Access**: Admin (`Role.ADMIN`, `users:suspend`)
- **Response**: `UserDto`

---

## 4. Forms (Workspace)

All routes require authentication, tenant scoping, and appropriate `forms:*` permissions.

### `POST /forms`
- **Permission**: `forms:create`
- **Request Body**: `{ name: string }`
- **Response**: `FormDto`

### `GET /forms`
- **Permission**: `forms:read`
- **Response**: `FormDto[]` (Tenant-scoped)

### `GET /forms/:id`
- **Permission**: `forms:read`
- **Response**: `FormDto` (Throws 403 on IDOR/cross-tenant access)

### `PATCH /forms/:id/draft`
- **Permission**: `forms:update`
- **Request Body**: `UpdateDraftDto`
- **Response**: `FormDto`

### `POST /forms/:id/deploy`
- **Permission**: `forms:deploy`
- **Response**: `FormDto` (Atomic release of immutable version snapshot)

### `PATCH /forms/:id/settings`
- **Permission**: `forms:update`
- **Request Body**: `UpdateSettingsDto` (SSRF-protected webhook validation)
- **Response**: `FormDto`

### `POST /forms/:id/versions/:versionId/deploy`
- **Permission**: `forms:deploy`
- **Response**: `FormDto` (Re-activates historical immutable version)

### `GET /forms/:id/data`
- **Permission**: `submissions:read`
- **Query Params**: `?format=csv` (optional)
- **Response**: `FormDataViewDto` or CSV stream

---

## 5. Public Forms Runtime

### `GET /public/forms/:publicId`
- **Access**: Public
- **Headers**: Emits `ETag` (strong SHA-256), `Cache-Control: public, no-cache`, `Last-Modified`
- **Response**: `PublicFormDto` (Returns 304 if cache fresh; draft AST is never exposed)

### `POST /public/forms/:publicId/submissions`
- **Access**: Public
- **Request Body**: `{ data: Record<string, any> }`
- **Rate Limit**: Edge + API throttled
- **Response**: `{ message: string, id: string }`
