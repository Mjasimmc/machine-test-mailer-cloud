# Development: Running Automated Tests

> **Scope**: Executing Jest E2E tests and type validation.  
> **Source of Truth**: `apps/api/package.json` and `apps/api/test/`.  
> **Last Verified**: 2026-09-24

---

## 1. Running Tests

To run all automated end-to-end tests:

```bash
pnpm test
```

This runs Jest across:
- `apps/api/test/app.e2e-spec.ts` (Auth, Users, Admin Moderation)
- `apps/api/test/forms.e2e-spec.ts` (Forms CRUD, Draft Autosave, Version Deployment, Submissions, CSV Export)
- `apps/api/test/websocket.e2e-spec.ts` (WebSocket Connection and Suspension Traps)

---

## 2. Running Linting & Type Checking

To verify types across all monorepo packages without emitting JS:

```bash
pnpm lint
```
