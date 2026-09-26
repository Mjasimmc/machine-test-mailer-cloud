# Development: Troubleshooting Common Issues

> **Scope**: Common errors during local development and their solutions.  
> **Source of Truth**: Developer environment configurations and error logs.  
> **Last Verified**: 2026-09-24

---

## 1. Common Issues & Resolutions

### Issue 1: `@saas/shared` module not found or outdated
- **Cause**: Shared package was not built after changes.
- **Solution**: Run `pnpm --filter @saas/shared build`.

### Issue 2: `MongooseServerSelectionError` on API startup
- **Cause**: Local MongoDB is not running or `MONGODB_URI` is pointing to an incorrect host/port.
- **Solution**: Ensure MongoDB is running locally (`net start MongoDB` or `docker run -d -p 27017:27017 mongo`) and verify `apps/api/.env`.

### Issue 3: Sass syntax parse errors with dotted variables
- **Cause**: In Sass/SCSS, names containing dots like `var(--space-2.5)` cause syntax errors.
- **Solution**: Use integer-based CSS variable tokens (`var(--space-2)`) or standard rem values (`0.625rem`).
