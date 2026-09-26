# Contracts: External & Infrastructure Integrations

> **Scope**: External dependencies, infrastructure services, and integration boundaries.  
> **Source of Truth**: Package dependencies and service implementations.  
> **Last Verified**: 2026-09-25

---

## 1. Infrastructure Services

| Service | Protocol | Direction | Purpose |
|---|---|---|---|
| **MongoDB** | Wire Protocol (`mongodb://...`) | Outbound | Authoritative persistence for users, forms, versions, submissions, audit logs |
| **Redis** | RESP (`redis://...`) | Outbound | Socket.IO Pub/Sub adapter, distributed state, async queue |
| **HashiCorp Vault** | HTTP/REST (`http://...:8200`) | Outbound | Ephemeral secret management (KV v2 engine) |
| **MinIO / AWS S3** | S3 API (`http://...:9000`) | Outbound | Binary object storage for uploads and CSV exports |
| **Webhooks** | HTTP/HTTPS POST | Outbound | External notifications (guarded by SSRF IP validation) |
| **Browser Client** | HTTP / WebSocket | Inbound | REST API consumption and real-time event delivery |
