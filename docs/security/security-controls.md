# Security: Measurable Security Controls & Verification

> **Scope**: Concrete security controls, verification commands, and test coverage.  
> **Source of Truth**: Test suites in `apps/api/test/` and code implementations.  
> **Last Verified**: 2026-09-25

---

## 1. Measurable Security Controls

| Control | Implementation | Verification Command | Test File |
|---|---|---|---|
| **Short-Lived JWT** | Expiration: 15 minutes, algorithm: HS256 | `pnpm test` | `test/app.e2e-spec.ts` |
| **Refresh Rotation** | Rotation with family reuse detection | `pnpm test` | `test/app.e2e-spec.ts` |
| **Active User Enforcement** | Suspended users receive HTTP 403 `ACCOUNT_SUSPENDED` | `pnpm test` | `test/app.e2e-spec.ts` |
| **Cross-Tenant IDOR Guard** | Accessing foreign forms returns HTTP 403 | `pnpm test` | `test/forms.e2e-spec.ts` |
| **Public Caching ETag** | SHA-256 strong ETag with 304 Not Modified | `pnpm test` | `test/forms.e2e-spec.ts` |
| **Realtime Revocation** | `user:suspended` emitted via Socket.IO Redis adapter | `pnpm test` | `test/websocket.e2e-spec.ts` |
| **Infrastructure Readiness** | `/health/readiness` checks DB and Redis | `pnpm test` | `test/infrastructure.e2e-spec.ts` |
| **Non-Root Execution** | `USER node` in Dockerfile | Container inspection | `apps/api/Dockerfile` |
| **SSRF Webhook Validation** | Blocks RFC 1918 and `169.254.169.254` | Unit / E2E verification | `apps/api/src/common/utils/ssrf-protection.ts` |
| **ReDoS Defense** | Bounds nested quantifiers and input lengths | Unit / E2E verification | `apps/api/src/common/utils/safe-regex.ts` |
