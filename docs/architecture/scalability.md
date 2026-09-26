# Architecture: Scalability & Performance Model

> **Scope**: Concurrency model, database query efficiency, horizontal scaling, and caching.  
> **Source of Truth**: Implementation across `apps/api/src/`, `nginx/`, and `docker-compose.yml`.  
> **Last Verified**: 2026-09-25

---

## 1. Concurrency & Performance Profile

### Backend Concurrency Model
* NestJS operates asynchronously on the Node.js event loop.
* Non-blocking I/O queries MongoDB and Redis using Promises and async connection pooling.
* Deployment concurrency collisions are resolved via an atomic retry loop on MongoDB `E11000`.

### Compound Database Indexing
All high-traffic queries hit compound indexes:
* **Users**: `{ tenantId: 1, email: 1 }`
* **Forms**: `{ tenantId: 1, updatedAt: -1 }`
* **Versions**: `{ formId: 1, versionNumber: 1 }` (unique) & `{ tenantId: 1, formId: 1, versionNumber: -1 }`
* **Submissions**: `{ tenantId: 1, formId: 1, createdAt: -1 }`
* **Refresh Tokens**: `{ userId: 1, family: 1 }` & `{ expiresAt: 1 }` (TTL auto-cleanup)

---

## 2. Implemented Horizontal Scaling Strategies

1. **Stateless API Tier**:
   * API nodes maintain no local session state in memory. JWT access tokens are validated independently against the shared Vault secret.
2. **Socket.IO Redis Pub/Sub Adapter**:
   * Multi-instance WebSocket scaling is fully active via `RedisIoAdapter` (`@socket.io/redis-adapter`). Real-time moderation and user suspension fan out across all cluster instances.
3. **Deterministic Edge Caching (ETag)**:
   * Public form requests emit deterministic strong ETags and `Cache-Control: public, no-cache`. Responses return HTTP 304 on cache hits, offloading origin server CPU and network bandwidth.
4. **Asynchronous Notification Queues**:
   * Heavy webhook notifications are dispatched to Redis queues asynchronously, preserving low latency for submission POST requests.
