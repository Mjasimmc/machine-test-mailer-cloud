# Repository Rules & Operational Directives for AI Agents

> **Scope**: Repository-wide architectural boundaries, coding standards, validation commands, and modification constraints.  
> **Source of Truth**: [`package.json`](file:///c:/Users/Muhammed%20Jasim/machine-test/package.json), [`pnpm-workspace.yaml`](file:///c:/Users/Muhammed%20Jasim/machine-test/pnpm-workspace.yaml), and source implementations in `apps/` and `packages/`.  
> **Last Verified**: 2026-09-24

---

## 1. Repository Structure & Workspace Map

This project is configured as a **pnpm monorepo** managed through [`pnpm-workspace.yaml`](file:///c:/Users/Muhammed%20Jasim/machine-test/pnpm-workspace.yaml).

```text
/
├── apps/
│   ├── api/                     # NestJS 11 + Mongoose backend REST API & WebSocket server
│   │   ├── src/                 # Application code (auth, users, admin, dashboard, forms, websocket)
│   │   ├── test/                # Jest E2E test suites (app, forms, websocket)
│   │   └── prisma/              # [DEAD ARTIFACT - DO NOT USE] Legacy unused schema
│   │
│   └── web/                     # React 19 + Vite 6 Single Page Application (SPA)
│       ├── src/app/             # App entry, router (AppRouter), AuthProvider, SocketProvider
│       ├── src/features/        # Feature slices (admin, auth, dashboard, forms, misc, profile)
│       ├── src/layouts/         # AdminLayout, UserLayout, PublicLayout
│       └── src/styles/          # Design tokens and global SCSS variables
│
├── packages/
│   └── shared/                  # Canonical DTOs, Enums, Interfaces, Form Schema AST types
│       └── src/
│           ├── index.ts         # User, Auth, Role, Socket events DTOs
│           └── types/form.ts    # FormElement, FormSection, FormZone, validation types
│
├── docs/                        # Complete system, domain, contract, and architectural documentation
├── README.md                    # Developer onboarding & quick start
├── ARCHITECTURE.md              # System architecture blueprint & request lifecycles
├── CONTRIBUTING.md              # Contributor guidelines & git workflow
└── SECURITY.md                  # Security policies, authentication pipeline, threat model
```

---

## 2. Architectural Rules & Invariants

### 2.1 Dependency Direction & Module Isolation
* **`packages/shared`** is the leaf dependency. It must **never** import from `apps/api` or `apps/web`.
* **`apps/web`** and **`apps/api`** depend on `@saas/shared` via the `workspace:*` protocol.
* **No Direct Web-to-API Import**: `apps/web` communicates with `apps/api` exclusively over HTTP REST (`fetch`) and WebSockets (`socket.io-client`). It must **never** import backend services, schemas, or models directly.
* **Database Layer**: MongoDB via `@nestjs/mongoose` is the **only active database**. Do **not** use or import Prisma in `apps/api/src`.

### 2.2 Form Builder & Public Form Separation
* **No Universal Renderer**: The Form Editor ([`FormCanvasHierarchical.tsx`](file:///c:/Users/Muhammed%20Jasim/machine-test/apps/web/src/features/forms/builder/FormCanvasHierarchical.tsx)) and the Public Form Runtime ([`PublicFormView.tsx`](file:///c:/Users/Muhammed%20Jasim/machine-test/apps/web/src/features/forms/public/PublicFormView.tsx)) must remain decoupled.
* They share AST contract types ([`packages/shared/src/types/form.ts`](file:///c:/Users/Muhammed%20Jasim/machine-test/packages/shared/src/types/form.ts)) and UI field controls ([`apps/web/src/components/fields/FieldElement.tsx`](file:///c:/Users/Muhammed%20Jasim/machine-test/apps/web/src/components/fields/FieldElement.tsx)), but render distinct interaction trees (editable controls vs. validation/input runtime).

### 2.3 Form Lifecycle & Versioning Invariant
* **Single Active Form Draft**: Every form has at most **one** current mutable draft stored in `Form.draft`.
* **Immutable Snapshot Releases**: Publishing a form creates a frozen snapshot in `FormVersion` with an incremental `versionNumber`. Submissions link permanently to `versionId`.
* Draft updates must **never** mutate historical `FormVersion` records.

---

## 3. Development & Coding Conventions

### 3.1 Backend (`apps/api`)
* **Framework**: NestJS 11 with Express adapter.
* **Controller Guards**:
  - Authenticated routes **must** be decorated with `@UseGuards(JwtAuthGuard, ActiveUserGuard)`.
  - Admin-only routes **must** also include `@UseGuards(RolesGuard)` and `@Roles(Role.ADMIN)`.
* **Data Access**: Use Mongoose `@InjectModel(...)` with `Model<TDocument>`.
* **DTO Validation**: Class-validator annotations (`@IsString()`, `@IsEmail()`, `@IsOptional()`) with global `ValidationPipe` enabled.
* **Database Queries**: Scope all user-owned resource queries by `userId` to guarantee tenant/user isolation.

### 3.2 Frontend (`apps/web`)
* **Framework**: React 19 + TypeScript + Vite.
* **Styling**: Vanilla SCSS modules and CSS custom properties (variables) defined in [`apps/web/src/styles/tokens.scss`](file:///c:/Users/Muhammed%20Jasim/machine-test/apps/web/src/styles/tokens.scss).
* **SCSS Variable Syntax**: Avoid dotted custom property names (e.g. do not write `var(--space-2.5)`). Use standard CSS units or integer-based tokens (`0.625rem`, `var(--space-2)`).
* **Layout Safeguards**: All custom width inputs must include `maxWidth: '100%'` and `boxSizing: 'border-box'` to prevent canvas and mobile viewport overflow.
* **State Management**: React context (`AuthProvider`, `SocketProvider`) for global auth/session state; local `useState`/`useCallback` for feature-level interactions.

---

## 4. Verification & Validation Commands

All commands are defined in the workspace `package.json` files and must be executed using `pnpm`:

| Purpose | Command | Scope |
|---|---|---|
| **Development** | `pnpm dev` | Starts concurrent API (`:3000`) and Web (`:5173`) |
| **Full Build** | `pnpm build` | Builds `@saas/shared`, `@saas/api`, and `@saas/web` |
| **Lint & Typecheck** | `pnpm lint` | Runs `tsc --noEmit` across all workspace packages |
| **Automated Tests** | `pnpm test` | Runs Jest E2E test suites in `@saas/api` |
| **Database Seed** | `pnpm seed` or `pnpm db:seed` | Seeds admin account and sample users into MongoDB |

---

## 5. Change Management & Guardrails

1. **Schema/DTO Changes**: When adding or updating domain interfaces, modify [`packages/shared/src/index.ts`](file:///c:/Users/Muhammed%20Jasim/machine-test/packages/shared/src/index.ts) first, run `pnpm --filter @saas/shared build`, and then update backend/frontend consumers.
2. **Database Changes**: Mongoose schemas live in `apps/api/src/*/schemas/`. Any schema property additions must specify sensible defaults and appropriate compound indexes.
3. **Security Constraints**: Never expose password hashes or sensitive fields in `.toJSON()` transforms.
4. **Browser Testing Directive**: AI agents must **never** launch browser subagents or automated browser testing. Code verification must rely on type checks, unit/E2E test suites, and build scripts.
