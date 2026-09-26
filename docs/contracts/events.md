# Contracts: WebSocket & Real-Time Events

> **Scope**: WebSocket gateway protocols, connection authentication, room authorization, and emitted event payloads.  
> **Source of Truth**: [`apps/api/src/realtime/realtime.gateway.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/realtime/realtime.gateway.ts) and [`packages/shared/src/index.ts`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/index.ts).  
> **Last Verified**: 2026-09-25

---

## 1. Gateway Connection & Authentication

- **Protocol**: Socket.IO v4
- **Handshake Auth**:
  ```typescript
  io(WS_URL, {
    auth: { token: accessToken },
  })
  ```
- **Connection Logic**:
  - `RealtimeGateway.handleConnection(client: Socket)`
  - Verifies token signature with algorithm restriction `HS256`.
  - Verifies user exists in MongoDB, is active (`status === 'ACTIVE'`), and `tokenVersion` matches.
  - Client automatically joins authorized rooms: `user:${userId}` and `tenant:${tenantId}`.
  - Subscriptions to unauthorized foreign rooms are rejected.

---

## 2. Event Specifications

### `user:suspended` (`SOCKET_EVENTS.USER_SUSPENDED`)
- **Direction**: Server $\to$ Client
- **Target Room**: `user:${userId}`
- **Cluster Distribution**: Broadcasts across all cluster nodes via Redis Pub/Sub adapter.
- **Payload**:
  ```typescript
  {
    userId: string;
    message: string;
  }
  ```
- **Server Action**: Emits event and executes `server.in(room).disconnectSockets(true)` to terminate all active connections.
- **Client Action**: Clears tokens from `localStorage` and navigates to `/account-suspended`.
