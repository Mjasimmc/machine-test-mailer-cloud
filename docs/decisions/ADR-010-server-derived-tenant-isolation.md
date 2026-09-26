# ADR-010: Server-Derived Multi-Tenant Context & Query Scoping

## Context
Relying solely on `userId` checks does not provide true multi-tenant workspace isolation. Relying on client-supplied `tenantId` headers creates severe IDOR and tenant-spoofing risks.

## Decision
Derive tenant context strictly server-side from the authenticated token payload (`req.user.tenantId`) or authoritative form record. Prefix compound indexes across all tenant collections with `tenantId` and reject cross-tenant access with HTTP 403 Forbidden.

## Alternatives Considered
1. **Client-Provided Tenant Headers**: Highly vulnerable to spoofing and tampering.
2. **Database-Per-Tenant**: Significant operational overhead and connection pool exhaustion at scale.

## Consequences & Tradeoffs
* **Benefits**: Robust isolation preventing cross-tenant reads, writes, and exports without requiring separate databases.
* **Tradeoffs**: Requires compound indexing on all collections (`{ tenantId: 1, ... }`).

## Status
**Accepted & Implemented** (2026-09-25)
