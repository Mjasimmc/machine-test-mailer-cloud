# Operations: Deployment & Production Build

> **Scope**: Building packages, container orchestration, non-root execution, and production deployment environments.  
> **Source of Truth**: `docker-compose.yml`, `package.json`, and Dockerfiles.  
> **Last Verified**: 2026-09-25

---

## 1. Production Build Pipeline

Execute the root workspace build command:

```bash
pnpm build
```

This sequentially:
1. Compiles `@saas/shared` via `tsc` to generate types and JS artifacts in `packages/shared/dist`.
2. Compiles `@saas/api` via `nest build` to generate `apps/api/dist`.
3. Compiles `@saas/web` via `tsc && vite build` to generate optimized production static files in `apps/web/dist`.

---

## 2. Multi-Container Orchestration (`docker-compose.yml`)

The platform includes a complete multi-container production topology:

```bash
docker compose up --build -d
```

### Deployed Services:
* `edge-lb`: Nginx reverse proxy / load balancer on port `80:80`.
* `web`: Production React SPA served via Nginx on internal port `80`.
* `api-1`, `api-2`: Stateless API instances on internal port `3000` executing as non-root `USER node`.
* `mongodb`: MongoDB 7.0 database (internal port `27017`).
* `redis`: Redis 7.2 distributed pub/sub and state (internal port `6379`).
* `vault`: HashiCorp Vault server (internal port `8200`).
* `minio`: S3-compatible binary storage (internal port `9000`).

---

## 3. Environment Progression

* **Development**: Local Node/Vite processes, local MongoDB, optional Redis, environment variable fallback.
* **Staging**: Docker Compose cluster running in staging VPC, isolated staging database, staging Vault path.
* **Production**: Enterprise CDN (Cloudflare/CloudFront) $\to$ Ingress / ALB $\to$ Kubernetes/ECS multi-instance API deployment $\to$ Managed MongoDB Atlas (Replica Set) + Managed Redis Cluster (ElastiCache) + Production Vault HA.
