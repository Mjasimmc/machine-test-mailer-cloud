# Contributing Guidelines

> **Scope**: Developer contribution workflow, code formatting standards, branch management, and PR validation rules.  
> **Source of Truth**: `package.json` scripts and workspace configuration.  
> **Last Verified**: 2026-09-25

---

## 1. Development Workflow

1. **Clone & Install**:
   ```bash
   git clone <repo-url>
   cd machine-test
   pnpm install
   ```

2. **Database Setup**:
   - Ensure local MongoDB is active on `mongodb://127.0.0.1:27017`.
   - Seed sample data:
     ```bash
     pnpm seed
     ```

3. **Start Development**:
   ```bash
   pnpm dev
   ```

---

## 2. Coding Standards

### TypeScript & Monorepo Practices
- Always maintain strict TypeScript types. Avoid using `any` unless dealing with arbitrary JSON payloads where typed schemas do not apply.
- Cross-package contracts (DTOs, Enums, Interfaces) must be placed in `packages/shared/src/`.
- After modifying `@saas/shared`, execute:
  ```bash
  pnpm --filter @saas/shared build
  ```

### SCSS & Frontend Conventions
- Use CSS variables defined in `apps/web/src/styles/tokens.scss`.
- Do not write dotted variable tokens (e.g. `var(--space-2.5)`). Use valid standard units or integer variable tokens.
- All form element containers and layout wrappers must enforce `maxWidth: 100%` and `boxSizing: border-box`.

### Backend Conventions
- Every authenticated controller must be protected with `@UseGuards(JwtAuthGuard, ActiveUserGuard)`.
- Scope database lookups to the authenticated `userId` to enforce user isolation.
- Validate request payloads using `class-validator` and `class-transformer` DTOs.

---

## 3. Pre-Commit / PR Validation Checklist

Before opening a pull request or merging changes, all of the following commands must succeed with exit code `0`:

```bash
# 1. Typecheck and lint all packages
pnpm lint

# 2. Run automated E2E tests
pnpm test

# 3. Verify clean production build
pnpm build
```

---

## 4. Verification Directive for AI Agents
- AI coding agents must **never** launch browser subagents or automated browser testing. Code verification must rely on type checks, unit/E2E test suites, and build scripts.
