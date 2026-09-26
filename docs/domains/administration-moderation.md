# Domain: Administration & Moderation

> **Scope**: Admin dashboard metrics, user search, account suspension, audit logging, and real-time moderation broadcasting.  
> **Source of Truth**: [`apps/api/src/administration/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/administration/).  
> **Last Verified**: 2026-09-25

---

## 1. Capabilities & Endpoints

1. **Platform Stats (`GET /admin/dashboard/stats`)**:
   - `totalUsers`: Total number of users registered in MongoDB.
   - `activeUsers`: Users with `status === 'ACTIVE'`.
   - `suspendedUsers`: Users with `status === 'SUSPENDED'`.
2. **User Search & Listing (`GET /admin/users?search=query`)**:
   - Requires `users:read` permission.
   - Performs case-insensitive regex search on `name` and `email`.
3. **User Suspension (`PATCH /admin/users/:id/suspend`)**:
   - Requires `users:suspend` permission and `Role.ADMIN`.
   - Blocks self-suspension or suspension of fellow administrators.
   - Updates `user.status = 'SUSPENDED'` in MongoDB.
   - Triggers `RealtimeService.emitUserSuspended(userId)`, broadcasting across Redis to disconnect active sockets.
   - Records `user:suspended` in `AuditLog`.
4. **User Unsuspension (`PATCH /admin/users/:id/unsuspend`)**:
   - Requires `users:suspend` permission and `Role.ADMIN`.
   - Restores `user.status = 'ACTIVE'`.
   - Records `user:unsuspended` in `AuditLog`.
