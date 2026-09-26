# ADR-011: Short-Lived Access Tokens with Refresh Token Family Rotation

## Context
Long-lived access tokens (e.g. 7 days) expose applications to persistent unauthorized access if a token is intercepted. Conversely, requiring frequent user logins degrades usability.

## Decision
Implement short-lived access tokens (15-minute expiration, HS256) combined with rotating refresh tokens stored as SHA-256 hashes in `refreshtokens`. Group refresh tokens into cryptographically random families. If an already-revoked refresh token is presented, revoke the entire family immediately (reuse detection). Track `tokenVersion` on user documents for instant cluster-wide revocation upon password change or logout-all.

## Alternatives Considered
1. **Long-lived Access Tokens (7d)**: Incur severe vulnerability window upon token theft.
2. **Stateful Session Store (Redis sessions)**: Requires database lookup on every request, adding latency.

## Consequences & Tradeoffs
* **Benefits**: High security with immediate session revocation and replay attack defense, while keeping access token verification stateless and fast.
* **Tradeoffs**: Requires refresh flow endpoint (`POST /auth/refresh`) and database storage for refresh tokens.

## Status
**Accepted & Implemented** (2026-09-25)
