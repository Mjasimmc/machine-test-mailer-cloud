# ADR-004: Real-Time Session Revocation via WebSockets

## Status
Accepted

## Context
When an administrator suspends a user, relying solely on HTTP request guards leaves the user's active browser session open until their next API call or page navigation.

## Decision
Implement a **Socket.IO WebSocket Gateway** (`EventsGateway`). When an admin suspends a user via `PATCH /admin/users/:id/suspend`, the backend immediately broadcasts a `user:suspended` event to the dedicated socket room `user:${userId}`.

## Consequences
- **Positive**: Suspended users are instantly kicked out of their active session without needing a page refresh. The frontend wipes `localStorage` tokens and redirects to `/account-suspended`.
- **Negative**: Adds persistent WebSocket connection overhead per active user tab. In multi-instance deployments, requires a Redis adapter to broadcast across backend nodes.

## Related Areas
- `apps/api/src/websocket/events.gateway.ts`
- `apps/web/src/app/providers/SocketProvider.tsx`
