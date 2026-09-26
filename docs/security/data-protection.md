# Security: Data Protection & Privacy

> **Scope**: Credential protection, data serialization transforms, and environment variable secrecy.  
> **Source of Truth**: Mongoose schemas in `apps/api/src/*/schemas/`.  
> **Last Verified**: 2026-09-24

---

## 1. Sensitive Data Stripping

All Mongoose schemas implement strict `toJSON` transformations:
- **`UserSchema`**: Explicitly removes `passwordHash` and `__v`.
- **`FormSchema` / `FormVersionSchema` / `FormSubmissionSchema`**: Removes `__v` and maps `_id` $\to$ `id`.

---

## 2. Secrets & Environment Protection

- Secrets (`JWT_SECRET`, `ADMIN_PASSWORD`) are loaded strictly from environment variables via `@nestjs/config`.
- `.env` files are ignored by git (`.gitignore`).
- Sample environment defaults are provided in `.env.example` templates without real credentials.
