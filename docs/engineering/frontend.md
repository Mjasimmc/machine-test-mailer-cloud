# Engineering: Frontend Architecture

> **Scope**: React 19 architecture, routing, state management, and design system components.  
> **Source of Truth**: `apps/web/src/`.  
> **Last Verified**: 2026-09-25

---

## 1. Directory Structure

```text
apps/web/src/
├── app/
│   ├── providers/               # AuthProvider, SocketProvider
│   └── router/                  # AppRouter, AdminRoute, ProtectedRoute, PublicRoute
├── components/                  # Design system primitives (Button, Modal, Toast, Table, Fields)
├── features/                    # Slices (admin, auth, dashboard, forms, misc, profile)
├── layouts/                     # AdminLayout, UserLayout, PublicLayout
├── services/                    # HTTP fetch wrapper (api.ts)
└── styles/                      # Design tokens (tokens.scss, globals.scss)
```

---

## 2. State & Context Architecture

- **`AuthProvider`**: Manages current user profile (`UserDto`), active JWT token, and login/logout state via `localStorage`.
- **`SocketProvider`**: Manages the Socket.IO lifecycle and listens for server push events (`user:suspended`).
- **Form Builder**: Encapsulates builder state in `useCallback`/`useState` hooks within `FormEditorPage`, triggering debounced or explicit autosaves to `PATCH /forms/:id/draft`.
