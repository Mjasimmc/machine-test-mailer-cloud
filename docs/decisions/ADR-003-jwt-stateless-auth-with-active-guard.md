# ADR-003: JWT Stateless Authentication with DB Active Guard

## Status
Accepted

## Context
The platform requires secure authentication for both Administrator and Standard User accounts, while supporting instant account suspension by administrators. Standard stateless JWTs remain valid until expiration even after an account has been suspended in the database.

## Decision
Use standard **stateless JWT tokens** issued on login/registration, combined with a mandatory **`ActiveUserGuard`** executed on every authenticated endpoint.

## Consequences
- **Positive**: Standard JWT headers across REST endpoints; immediate rejection (HTTP `403 Forbidden`, `ACCOUNT_SUSPENDED`) if a suspended user attempts an API request with an unexpired token.
- **Negative**: Adds a fast indexed MongoDB `findById` read query on each authenticated request.

## Related Areas
- `apps/api/src/auth/`
- `apps/api/src/common/guards/active-user.guard.ts`
