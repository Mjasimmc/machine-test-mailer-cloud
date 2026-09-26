# Operations: Monitoring & Health Verification

> **Scope**: Health probes, dependency verification, structured JSON logging, and correlation tracking.  
> **Source of Truth**: [`apps/api/src/infrastructure/observability/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/observability/) and `apps/api/src/realtime/`.  
> **Last Verified**: 2026-09-25

---

## 1. Automated Health Probes

### A. Liveness Probe (`GET /health/liveness` or `GET /health`)
* **Purpose**: Evaluates Node.js event loop responsiveness.
* **Response**:
  ```json
  {
    "status": "ok",
    "uptime": 1245.5,
    "timestamp": "2026-09-25T09:30:00.000Z"
  }
  ```
* **Status Code**: Always HTTP 200 while process is operational.

### B. Readiness Probe (`GET /health/readiness`)
* **Purpose**: Verifies that primary data services are reachable before routing traffic.
* **Checks**:
  - MongoDB connection (`readyState === 1`)
  - Redis ping response
  - Vault connection status
* **Response (Ready)**: HTTP 200
  ```json
  {
    "status": "ready",
    "timestamp": "...",
    "services": {
      "database": { "status": "up", "state": 1 },
      "redis": { "status": "up" },
      "vault": { "status": "connected" }
    }
  }
  ```
* **Response (Not Ready)**: HTTP 503 Service Unavailable if MongoDB is disconnected. Load balancer immediately ceases routing traffic to this instance.

---

## 2. Distributed Tracing & Correlation

* **`CorrelationMiddleware`**:
  - Extracts incoming `X-Correlation-ID` or generates a unique correlation ID (`req_${timestamp}_${hex}`).
  - Attaches `req.correlationId` to execution context and returns it in the response header `X-Correlation-ID`.
  - Propagated through audit logs and structured application logs.

---

## 3. Structured JSON Logging

* **`StructuredLoggerService`**:
  - Formats output as JSON in production:
    ```json
    {
      "timestamp": "2026-09-25T09:30:00.000Z",
      "level": "log",
      "context": "FormsService",
      "correlationId": "req_1727256600000_a1b2c3d4",
      "message": "Form created successfully"
    }
    ```
