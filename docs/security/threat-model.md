# Security: Threat Model & Attack Surface

> **Scope**: Attack vectors, threat actors, attack surfaces, implemented defenses, and residual risk.  
> **Source of Truth**: Implementation across `apps/api/src/`, `nginx/`, and `docker-compose.yml`.  
> **Last Verified**: 2026-09-25

---

## 1. Attack Surface Matrix

| Attack Vector | Surface | Implemented Defense | Residual Risk |
|---|---|---|---|
| **Cross-Tenant Data Access (IDOR / BOLA)** | `/forms/:id`, `/forms/:id/data`, `/forms/:id/draft` | Server-derived tenant context and ownership validation throwing HTTP 403. | None identified. |
| **ReDoS (Catastrophic Regex Backtracking)** | `POST /public/forms/:id/submissions` | `safeRegexTest` rejects dangerous nested quantifiers and bounds string lengths. | Highly complex valid regexes may require extended evaluation bounds. |
| **Server-Side Request Forgery (SSRF)** | Webhook notification dispatch (`form.settings.webhookUrl`) | `validateSafeUrl` with DNS resolution explicitly blocks private IPs, loopback, and cloud metadata (`169.254.169.254`). | DNS rebinding in fast-changing dynamic DNS (mitigated by outbound firewall rules in prod). |
| **Token Theft & Replay Attacks** | `/auth/refresh` | Refresh token family rotation with reuse detection revokes entire family upon reuse. | Unauthenticated attacker using active token before rotation. |
| **Session Invalidation Bypass** | Active access tokens | `tokenVersion` on user document; `JwtStrategy` rejects revoked versions immediately. | Minimal. |
| **Field Explosion & Payload Flooding** | Public form submissions | Max 200 keys, 50KB strings, prototype pollution blocking. | None identified. |
| **Database Injection & Mass Assignment** | All REST controllers | Mongoose strict schemas and global `ValidationPipe` with `whitelist: true` & `forbidNonWhitelisted: true`. | None. |
| **Brute Force & Credential Stuffing** | `/auth/login`, `/auth/register` | Nginx edge rate limiting (5r/s burst 10) + NestJS ThrottlerGuard. | Distributed botnets across thousands of IPs (requires Cloudflare/AWS WAF). |
| **Container Privilege Escalation** | Docker containers | `apps/api/Dockerfile` runs under non-root `USER node`. | None. |
| **Database Network Exposure** | MongoDB, Redis, Vault | Database ports omitted from host bindings in `docker-compose.yml`. | None. |
