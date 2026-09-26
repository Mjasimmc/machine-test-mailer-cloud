# Operations: Environment Configuration

> **Scope**: Environment variables, configuration files, and default values.  
> **Source of Truth**: `.env.example`, `apps/api/.env.example`, and configuration loaders.  
> **Last Verified**: 2026-09-25

---

## 1. Backend Environment Variables (`apps/api/.env`)

| Variable | Default Value | Required | Description |
|---|---|---|---|
| `PORT` | `3000` | No | Port for Express & Socket.IO server |
| `NODE_ENV` | `development` | No | Environment identifier (`development` / `production`) |
| `TRUST_PROXY` | `1` | No | Express reverse proxy trust setting for X-Forwarded headers |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/saas_db` | Yes | MongoDB connection URI |
| `REDIS_URL` | `redis://127.0.0.1:6379` | No (Prod Yes)| Redis URI for Pub/Sub adapter, distributed state, and queue |
| `VAULT_ENABLED` | `false` | No | Enables HashiCorp Vault secrets integration |
| `VAULT_ADDR` | `http://127.0.0.1:8200` | Conditional | Vault server API address |
| `VAULT_TOKEN` | `dev-root-token-...` | Conditional | Vault authentication token |
| `VAULT_PATH` | `secret/data/saas` | Conditional | Vault KV v2 mount path |
| `JWT_SECRET` | `super-secure-production-jwt-...` | Yes | Cryptographic HMAC secret for signing access tokens |
| `STORAGE_DRIVER`| `local` | No | Asset storage driver (`local` / `s3`) |
| `S3_ENDPOINT` | `http://127.0.0.1:9000` | Conditional | MinIO / AWS S3 endpoint URL |
| `S3_BUCKET` | `saas-forms` | Conditional | Target S3 bucket name |
| `ADMIN_EMAIL` | `admin@saas.local` | Yes | Seed administrator account email |
| `ADMIN_PASSWORD`| `AdminPassword123!` | Yes | Initial administrator account password |
| `FRONTEND_URL` | `http://localhost:5173` | No | Allowed CORS origin for web app |

---

## 2. Frontend Environment Variables (`apps/web/.env`)

| Variable | Default Value | Required | Description |
|---|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Yes | Base URL for REST API endpoints |
| `VITE_WS_URL` | `http://localhost:3000` | Yes | Base URL for Socket.IO WebSocket gateway |
