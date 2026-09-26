# ADR-007: Redis Pub/Sub Adapter for Horizontal Real-Time Scaling

## Context
When running multiple API instances behind a load balancer, WebSocket connections are distributed across separate Node.js processes. Emitting events (such as user suspension) on one instance does not reach clients connected to another instance if using the default in-memory Socket.IO adapter.

## Decision
Implement `RedisIoAdapter` using `@socket.io/redis-adapter` with dual ioredis connections (`pubClient` and `subClient`). Socket.IO rooms and events are published to Redis channels and delivered across all running API nodes.

## Alternatives Considered
1. **Sticky Sessions (IP Hash / Cookie Affiliation)**: Routes users to the same instance, but fails when an admin connected to Instance A suspends a user connected to Instance B.
2. **Polling HTTP Endpoints**: Adds significant network overhead and latency.

## Consequences & Tradeoffs
* **Benefits**: True horizontal scaling of real-time WebSocket connections across any number of backend replicas.
* **Tradeoffs**: Introduces operational dependency on Redis. Addressed by implementing an automatic in-memory fallback for single-node development when Redis is unconfigured.

## Status
**Accepted & Implemented** (2026-09-25)
