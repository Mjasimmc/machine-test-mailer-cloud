# Infrastructure: HashiCorp Vault & Secret Management

> **Scope**: Secrets lifecycle, Vault authentication boundary, secret retrieval, and development fallback.  
> **Source of Truth**: [`apps/api/src/infrastructure/vault/secrets.service.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/infrastructure/vault/secrets.service.ts) and [`docker-compose.yml`](file:///home/sct/dd/multi-tenant-form-builder/docker-compose.yml).  
> **Last Verified**: 2026-09-25

---

## 1. Secrets Boundary & Classification

The platform creates a strict operational boundary separating non-sensitive application configuration from cryptographic secrets:

| Class | Examples | Authority / Storage |
|---|---|---|
| **Non-Sensitive Config** | `PORT`, `NODE_ENV`, `TRUST_PROXY`, `LOG_LEVEL` | Environment variables / `.env` |
| **Sensitive Secrets** | `JWT_SECRET`, `MONGODB_URI`, `REDIS_URL`, `S3_SECRET_KEY` | HashiCorp Vault (KV v2 engine) |

---

## 2. Secrets Lifecycle & Retrieval

```text
API Startup
    │
    ▼
Is VAULT_ENABLED === 'true'?
    ├── YES ──> Connect to ${VAULT_ADDR}/v1/${VAULT_PATH} with VAULT_TOKEN
    │             ├─ Successful: Populate in-memory secret registry
    │             └─ Failed: Log error and terminate process (Fail-Closed)
    │
    └── NO  ──> Development Fallback: Read secrets from .env variables
```

1. **Production Mode (`VAULT_ENABLED=true`)**:
   * API connects to Vault over internal TLS / private network.
   * Pulls secrets from the configured KV v2 path.
   * If Vault is unreachable or required secrets are missing, the application **fails closed** during startup.
2. **Development Mode (`VAULT_ENABLED=false`)**:
   * Uses local environment variable defaults from `.env`.
   * Logged at startup to alert developers that Vault is bypassed.

---

## 3. Network Isolation & Security Guarantees

* **Zero Host Exposure**: Vault port `8200` is **not published to the public host** in `docker-compose.yml`. Only internal containers on `saas-network` can reach `http://vault:8200`.
* **Zero Logging of Secrets**: Structured logger explicitly redacts secret values, password hashes, and JWT tokens.
* **No Frontend Exposure**: Secret values are never bundled into the Vite React client build.
