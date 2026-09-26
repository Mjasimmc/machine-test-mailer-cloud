# Domain: Real-Time WebSockets & Event Gateway

> **Scope**: WebSocket connection lifecycle, JWT handshake verification, room authorization, and horizontal Redis scaling.  
> **Source of Truth**: [`apps/api/src/realtime/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/realtime/).  
> **Last Verified**: 2026-09-25

---

## 1. Gateway Architecture & Authentication

* **Protocol**: Socket.IO v4
* **Handshake Authentication**:
  - Validates JWT token from `client.handshake.auth.token` or `Authorization` header.
  - Verifies token signature with algorithm restriction `HS256`.
  - Verifies user exists in MongoDB and `user.status === 'ACTIVE'`.
  - Validates `tokenVersion` to reject revoked sessions.
* **Room Binding**:
  - Client automatically joins authorized rooms: `user:${userId}` and `tenant:${tenantId}`.
  - Arbitrary room subscription (`subscribe_room`) is strictly validated; foreign rooms are rejected.

---

## 2. Horizontal Scaling via Redis

* **`RedisIoAdapter`**: Connects to `REDIS_URL` using dual pub/sub ioredis instances.
* **Cluster Broadcasting**: When `RealtimeService.emitUserSuspended(userId)` is called on any cluster node, Redis Pub/Sub fans out the event across all API instances to the target `user:${userId}` room.
* **Forceful Disconnect**: In addition to emitting `user:suspended`, the server invokes `.disconnectSockets(true)` to terminate all open socket connections for the suspended account.
