# Engineering: Observability & Logging

> **Scope**: Console logging, diagnostic traces, and health verification.  
> **Source of Truth**: NestJS `Logger` instances in `EventsGateway` and NestJS bootstrap.  
> **Last Verified**: 2026-09-24

---

## 1. Logging Model

- **NestJS Built-In Logger**: The API utilizes NestJS `Logger` for lifecycle events (startup, MongoDB connection status, WebSocket connections/disconnections, suspension emissions).
- **Format**: Timestamped console logs output to `stdout` and `stderr`.

---

## 2. Health & Diagnostic Verification

- **API Health**: Running `GET /forms` or `GET /admin/dashboard/stats` verifies API runtime and MongoDB database connectivity.
- **WebSocket Verification**: Socket connection logs emit client connection IDs and room joining messages on connection.
