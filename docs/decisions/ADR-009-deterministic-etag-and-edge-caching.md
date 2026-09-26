# ADR-009: Deterministic Strong ETag and Edge Caching for Public Forms

## Context
High-traffic public forms receive thousands of requests per minute. Re-reading database records and transmitting full AST schemas on every public GET request causes unnecessary compute and egress network overhead.

## Decision
Compute a strong deterministic SHA-256 content hash over the immutable deployed version snapshot (`"${sha256(versionId + versionNumber + updatedAt)}"`). Emit `ETag`, `Cache-Control: public, no-cache`, and `Last-Modified`. Respond with HTTP 304 Not Modified when client or CDN presents matching `If-None-Match` or `If-Modified-Since`.

## Alternatives Considered
1. **Weak ETags (`W/"..."`)**: Semantically weak; indicates only equivalence rather than byte-for-byte identity.
2. **Fixed TTL Edge Caching without Revalidation**: Delays public visibility of new releases until cache expiration.

## Consequences & Tradeoffs
* **Benefits**: Instant reflection of new form releases upon deployment, combined with near-zero egress bandwidth on repeated client views.
* **Tradeoffs**: Origin server handles conditional validation, which is lightweight (sub-millisecond indexed lookup).

## Status
**Accepted & Implemented** (2026-09-25)
