# ADR-001: pnpm Workspace Monorepo Architecture

## Status
Accepted

## Context
The platform requires a shared contract layer (TypeScript types, enums, AST schema definitions) between the React Single Page Application (`apps/web`) and the NestJS backend API (`apps/api`). Multiple independent repositories would cause type drift, duplicate interfaces, and complex synchronization.

## Decision
Organize the codebase as a **pnpm monorepo** using `pnpm-workspace.yaml`. All shared interfaces, DTOs, and AST schemas are maintained in `packages/shared` and consumed via the `workspace:*` protocol.

## Consequences
- **Positive**: Single source of truth for contracts; single `pnpm install` and synchronized builds; zero runtime drift between API contracts and frontend fetch clients.
- **Negative**: Requires monorepo orchestration tools (`concurrently` for dev scripts); shared package must be built (`tsc`) before consuming applications compile.

## Constraints
- Leaf package `@saas/shared` must never depend on `apps/*`.

## Related Areas
- `package.json`
- `packages/shared`
