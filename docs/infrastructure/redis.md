# Infrastructure: Redis Architecture & Distributed State

> **Scope**: Redis cluster role, Socket.IO pub/sub scaling, distributed caching, queue backend, and failure behavior.  
> **Source of Truth**: [`apps/api/src/infrastructure/redis/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/redis/), [`apps/api/src/realtime/redis-io.adapter.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/realtime/redis-io.adapter.ts), and [`docker-compose.yml`](file:///home/sct/dd/multi-tenant-form-builder/docker-compose.yml).  
> **Last Verified**: 2026-09-25

---

## 1. Architectural Role of Redis

Redis is strictly employed for **distributed ephemeral state, pub/sub coordination, and asynchronous queuing**. It is **never the authoritative source of business data** (which resides in MongoDB).

```text
                  API Instance 1           API Instance 2
                        │                         │
                        ▼                         ▼
             ┌──────────────────────────────────────────────┐
             │                 REDIS CLUSTER                │
             ├──────────────────────────────────────────────┤
             │ 1. Socket.IO Pub/Sub Adapter                 │
             │    - Channel: socket.io#/#                   │
             │    - Cross-instance room routing             │
             │                                              │
             │ 2. Asynchronous Job Queue                    │
             │    - Key: saas:jobs:queue                    │
             │    - Webhook notifications & exports         │
             │                                              │
             │ 3. Distributed Ephemeral Cache               │
             │    - Short-lived TTL keys                    │
             └──────────────────────────────────────────────┘
```

---

## 2. Real-Time Socket.IO Pub/Sub Scaling

1. **`RedisIoAdapter`**:
   * Uses `@socket.io/redis-adapter` with two distinct ioredis connections (`pubClient` and `subClient`).
   * Broadcasts room messages across all running API instances.
   * Enables seamless real-time session invalidation: when an admin on `API-2` suspends a user connected to `API-1`, `RealtimeGateway.emitUserSuspended(userId)` publishes to Redis, and `API-1` receives the event and forcefully terminates the user's socket connection.
2. **Local Development Fallback**:
   * If Redis is unreachable during startup, `RedisIoAdapter` logs a warning and falls back to the in-memory Socket.IO adapter so local single-node development continues uninterrupted.

---

## 3. Failure Behavior & Graceful Degradation

| Failure Mode | Impact | System Reaction |
|---|---|---|
| **Redis Outage during Startup** | Pub/Sub & Queue unavailable | Falls back to in-memory adapter; queue runs in-process fallback. Core REST APIs boot normally. |
| **Redis Outage at Runtime** | Pub/Sub disconnected | Socket.IO degrades to local node broadcasting; health check `/health/readiness` flags Redis as down but returns HTTP 200 as long as MongoDB is up. |
| **Reconnection** | Automatic recovery | ioredis automatically reconnects with backoff and re-subscribes to channels without restarting the process. |

---

## 4. Production Security & Network Isolation

* **Private Network Confinement**: In `docker-compose.yml`, Redis port `6379` is **not bound to host ports** and is only reachable inside `saas-network`.
* **Authentication**: In production environments, `REDIS_URL` includes credentials (`redis://:<password>@redis-host:6379`).
* **Persistence**: Configured with append-only file (`AOF`) or RDB snapshots for queue durability.
