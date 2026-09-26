# ADR-008: HashiCorp Vault Secrets Management Boundary

## Context
Deploying production secrets in plaintext configuration files or environment variables increases the risk of credential leakage into version control, container images, or build logs.

## Decision
Introduce `SecretsService` in `apps/api/src/infrastructure/vault/` to decouple non-sensitive configuration from sensitive credentials (`JWT_SECRET`, `MONGODB_URI`, `REDIS_URL`, `S3_SECRET_KEY`). When `VAULT_ENABLED=true`, secrets are fetched from HashiCorp Vault KV v2 mount during process startup.

## Alternatives Considered
1. **Plain `.env` files**: Vulnerable to accidental commit or container layer leakage.
2. **Hardcoded secrets in Docker Compose**: Unsuitable for production.

## Consequences & Tradeoffs
* **Benefits**: Centralized secret lifecycle, audit logging, and rotation capability.
* **Tradeoffs**: Missing secrets cause fail-closed process termination in production. Local development gracefully falls back to `.env` variables when Vault is disabled.

## Status
**Accepted & Implemented** (2026-09-25)
