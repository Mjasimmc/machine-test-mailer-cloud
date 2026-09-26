# Engineering: Coding Standards & Best Practices

> **Scope**: Formatting, linting, TypeScript typing, and architectural guidelines.  
> **Source of Truth**: `tsconfig.base.json`, `package.json`, and source code patterns.  
> **Last Verified**: 2026-09-24

---

## 1. TypeScript Rules
- Strict mode is enabled (`"strict": true` in base configuration).
- Avoid `any` for known domain models. Always type DTOs, parameters, and return types explicitly.
- Cross-cutting types and interfaces belong in `@saas/shared`.

---

## 2. SCSS & Styling Rules
- Use CSS variables defined in `apps/web/src/styles/tokens.scss`.
- Avoid dotted custom property names (e.g. `var(--space-2.5)`). Write valid CSS units or integer variable tokens.
- Layout wrappers must specify `maxWidth: 100%` and `boxSizing: border-box`.

---

## 3. NestJS Backend Rules
- All controllers must use class-validator decorators on incoming DTOs.
- Always scope database queries with `userId` on tenant/user resources.
- Use `@InjectModel(Entity.name)` for Mongoose document model injections.
