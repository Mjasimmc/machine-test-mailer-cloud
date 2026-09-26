# ADR-012: Asynchronous Queueing and SSRF Protection for Webhooks

## Context
Triggering external webhooks synchronously within the public form submission HTTP request cycle creates two critical risks:
1. Slow external endpoints degrade submission latency or cause timeouts.
2. User-provided webhook URLs allow Server-Side Request Forgery (SSRF) targeting internal services (MongoDB, Redis, Vault, cloud metadata `169.254.169.254`).

## Decision
1. Dispatch webhook notifications asynchronously via `QueueService` to a Redis queue with in-process fallback.
2. Enforce strict SSRF pre-validation via `validateSafeUrl` with DNS resolution, rejecting private IPv4 ranges (RFC 1918), loopback, and link-local cloud metadata endpoints.

## Alternatives Considered
1. **Synchronous HTTP POST**: Fragile, slow, blocks submission response.
2. **Simple hostname regex check**: Fails against DNS rebinding, private IP aliases, or localhost numeric formats.

## Consequences & Tradeoffs
* **Benefits**: Submissions remain fast and reliable regardless of webhook endpoint latency; internal infrastructure is protected against SSRF.
* **Tradeoffs**: Webhooks execute asynchronously; failures are logged but do not block submission confirmation.

## Status
**Accepted & Implemented** (2026-09-25)
