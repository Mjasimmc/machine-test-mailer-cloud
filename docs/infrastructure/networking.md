# Infrastructure: Network Topology & Segmentation

> **Scope**: Network boundaries, ingress load balancing, container networking, and traffic isolation.  
> **Source of Truth**: [`nginx/nginx.conf`](file:///home/sct/dd/multi-tenant-form-builder/nginx/nginx.conf) and [`docker-compose.yml`](file:///home/sct/dd/multi-tenant-form-builder/docker-compose.yml).  
> **Last Verified**: 2026-09-25

---

## 1. Network Zones & Segmentation

```text
Zone                Components                         Exposure
────────────────────────────────────────────────────────────────────────
PUBLIC / EDGE       CDN, Edge WAF, Nginx (edge-lb)     Ports 80, 443 (Internet)
APPLICATION         API-1, API-2, Web SPA              Internal port 3000, 80
DATA / INTERNAL     MongoDB, Redis, Vault, MinIO       Zero host port mappings
```

---

## 2. Ingress & Reverse Proxy Rules (`nginx/nginx.conf`)

1. **Edge Rate Limiting**:
   * Sensitive auth routes (`/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/change-password`): 5 requests/sec, burst 10.
   * Public submissions (`/public/forms/[^/]+/submissions`): 5 requests/sec, burst 20.
   * General APIs (`/forms`, `/users`, `/admin`, `/dashboard`): 30 requests/sec, burst 50.
2. **Security Headers Enforced at Edge**:
   * `X-Content-Type-Options: nosniff`
   * `X-Frame-Options: SAMEORIGIN`
   * `X-XSS-Protection: "1; mode=block"`
   * `Referrer-Policy: "strict-origin-when-cross-origin"`
3. **WebSocket Proxy**:
   * Upgraded on path `/socket.io/` with `proxy_read_timeout 86400s`.
4. **Backend Load Balancing**:
   * `upstream api_backend` uses `least_conn` routing across `api-1:3000` and `api-2:3000`.

---

## 3. Communication Matrix

| Source | Destination | Protocol | Allowed | Purpose |
|---|---|---|---|---|
| Internet | Nginx (edge-lb) | HTTP/HTTPS | **YES** | Public ingress |
| Internet | MongoDB / Redis / Vault | TCP | **DENY** | Direct database access blocked |
| Nginx | API instances | HTTP 1.1 | **YES** | Reverse proxy routing |
| API | MongoDB | MongoDB Wire | **YES** | Authoritative document persistence |
| API | Redis | Redis RESP | **YES** | Pub/Sub, queue, ephemeral state |
| API | Vault | HTTP | **YES** | Secrets retrieval |
| API | MinIO | S3 API | **YES** | Binary object storage |
