# `@saas/shared` — Shared Contract & Schema AST Layer

> **What is this?**: Leaf TypeScript library containing canonical DTOs, interfaces, enums, and Form AST schema specifications shared across `apps/api` and `apps/web`.  
> **What does it own?**: Data Transfer Objects (`UserDto`, `AuthResponse`, `FormDto`, `FormVersionDto`), Enums (`Role`, `UserStatus`), Socket event constants (`SOCKET_EVENTS`), and Form AST models (`FormElement`, `FormSection`, `FormZone`).  
> **What does it depend on?**: Nothing (zero runtime dependencies).  
> **What depends on it?**: `apps/api` and `apps/web`.  

---

## 1. Directory Structure

```text
packages/shared/
├── src/
│   ├── index.ts             # Primary entry point exporting enums, DTOs, and event constants
│   └── types/
│       └── form.ts          # Canonical Form AST models, elements, zones, sections, and utilities
├── package.json             # Package configuration
└── tsconfig.json            # TypeScript build configuration
```

---

## 2. Invariants & Rules
- Must remain a leaf dependency. Never import from `apps/*`.
- When modifying shared types, run `pnpm --filter @saas/shared build` to update compiled declarations in `dist/`.
