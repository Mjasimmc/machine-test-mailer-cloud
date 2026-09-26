# `@saas/web` — Frontend Single Page Application (SPA)

> **What is this?**: React 19 + Vite 6 Single Page Application rendering the User Workspace, Admin Console, Form Builder Editor, Form Preview, Submissions Data Table, and Public Form Runtime.  
> **What does it own?**: Client UI, routing, interactive hierarchical form builder, public form submissions, and WebSocket session suspension listening.  
> **What does it depend on?**: `@saas/shared` (DTOs and AST types) and `@saas/api` (via HTTP REST and Socket.IO).  
> **What depends on it?**: End users and administrators in web browsers.  

---

## 1. Directory Structure

```text
apps/web/src/
├── app/
│   ├── providers/           # AuthProvider (JWT session state), SocketProvider (real-time events)
│   └── router/              # AppRouter (route configuration & role-based guards)
├── components/              # Shared UI primitives (Button, Modal, Toast, Table, Fields)
├── features/
│   ├── admin/               # Admin dashboard and user moderation tables
│   ├── auth/                # Login, Register, and Account Suspended pages
│   ├── dashboard/           # User dashboard
│   ├── forms/               # Form builder, canvas, properties panel, data table, public view
│   └── profile/             # Profile overview and edit form
├── layouts/                 # AdminLayout, UserLayout, PublicLayout
├── services/                # API client fetch wrapper (api.ts)
└── styles/                  # Design tokens (tokens.scss) and global styles
```

---

## 2. Invariants & Rules
- Keep Form Editor (`apps/web/src/features/forms/builder/FormCanvasHierarchical.tsx`) and Public Form Runtime (`apps/web/src/features/forms/public/PublicFormView.tsx`) decoupled.
- Form element containers must enforce `maxWidth: 100%` and `boxSizing: border-box`.
