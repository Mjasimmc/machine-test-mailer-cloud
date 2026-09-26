# Architecture: Runtime & Process Model

> **Scope**: Process execution, memory model, port assignments, and inter-process communication.  
> **Source of Truth**: `docker-compose.yml`, `package.json`, and service entry points.  
> **Last Verified**: 2026-09-25

---

## 1. Runtime Processes

| Process / Container | Engine | Port / Binding | Entry Point | Description |
|---|---|---|---|---|
| **`edge-lb`** | Nginx Alpine | `80:80` (Public) | `/etc/nginx/nginx.conf` | Ingress reverse proxy, SSL termination, and rate limiting |
| **`web`** | Nginx / Static | Port 80 (Internal) | `usr/share/nginx/html` | Production React SPA bundle |
| **`api-1`, `api-2`** | Node.js 20 (NestJS) | Port 3000 (Internal) | `apps/api/dist/main.js` | Horizontally scaled API nodes running as `USER node` |
| **`mongodb`** | MongoDB 7.0 | Port 27017 (Internal) | `mongod --bind_ip_all` | Authoritative persistence store |
| **`redis`** | Redis 7.2 | Port 6379 (Internal) | `redis-server` | Socket.IO Pub/Sub adapter, distributed state, and queue |
| **`vault`** | HashiCorp Vault 1.15 | Port 8200 (Internal) | `vault server` | Secrets management backend |
| **`minio`** | MinIO S3 API | Port 9000/9001 (Internal) | `minio server` | S3-compatible binary storage |

---

## 2. Process Communication & Protocols

1. **HTTP/1.1 REST**: Edge proxy routes requests to upstream API cluster using `least_conn` load balancing.
2. **WebSocket (Socket.IO v4)**: Persistent WebSocket connections upgraded via HTTP reverse proxy and linked across API nodes using the Redis Pub/Sub adapter.
3. **MongoDB Wire Protocol**: Mongoose maintains asynchronous connection pools to `mongodb:27017`.
4. **Internal Redis RESP**: Dual publisher and subscriber connections manage cross-instance broadcasting.
