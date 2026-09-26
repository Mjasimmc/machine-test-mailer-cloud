# Infrastructure: Asynchronous Queues & Background Workers

> **Scope**: Queue architecture, producer-consumer boundaries, job dispatching, and failure resilience.  
> **Source of Truth**: [`apps/api/src/infrastructure/queue/queue.service.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/queue/queue.service.ts).  
> **Last Verified**: 2026-09-25

---

## 1. Asynchronous Queue Architecture

Heavy or external I/O tasks are decoupled from synchronous HTTP request/response loops via `QueueService`:

```text
HTTP Request (e.g. POST /public/forms/:id/submissions)
     │
     ▼
Persistence to MongoDB (Fast, Synchronous)
     │
     ▼
QueueService.dispatch('webhook_notification', payload)
     ├── Primary: Redis Queue (saas:jobs:queue)
     └── Fallback: In-Process Asynchronous Worker
```

---

## 2. Implemented Job Types

### Job: `webhook_notification`
* **Trigger**: Public form submission received on a form with configured `webhookUrl`.
* **Payload**:
  ```json
  {
    "url": "https://external-service.com/webhook",
    "formId": "65b...",
    "submissionId": "65c...",
    "data": { "email": "user@example.com" }
  }
  ```
* **Security Guard**: `url` is pre-validated through SSRF protection (`validateSafeUrl`), disallowing private IP ranges and cloud metadata.
* **Worker Action**: Performs HTTP POST with JSON payload.
* **Failure Policy**: Logged on failure without blocking or rolling back the persistent submission record in MongoDB.

---

## 3. Resilience & In-Process Fallback

* If Redis is not available, `QueueService` processes the job asynchronously in-process via `setImmediate`, ensuring notifications are attempted even during transient Redis downtime.
