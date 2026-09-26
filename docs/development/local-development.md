# Development: Local Development Workflow

> **Scope**: Running development servers, live reloading, and package compilation.  
> **Source of Truth**: `package.json`.  
> **Last Verified**: 2026-09-25

---

## 1. Running the Full Stack

To start both the API and Web applications concurrently:

```bash
pnpm dev
```

- **Web Application**: [http://localhost:5173](http://localhost:5173) (Vite HMR)
- **API Backend**: [http://localhost:3000](http://localhost:3000) (NestJS Watch Mode)

---

## 2. Working on Shared Packages

If you modify types or DTOs in `packages/shared/src/`, recompile the shared package:

```bash
pnpm --filter @saas/shared build
```

This compiles TypeScript definitions into `packages/shared/dist/`, making them available to `apps/web` and `apps/api`.
