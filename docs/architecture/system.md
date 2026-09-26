# Architecture: System Overview & Modular Monolith Topology

> **Scope**: Application boundaries, structural modules, and communication channels.  
> **Source of Truth**: Monorepo package manifests and NestJS module imports in [`apps/api/src/app.module.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/app.module.ts).  
> **Last Verified**: 2026-09-25

---

## 1. System Topology

```mermaid
flowchart TD
    subgraph ClientLayer ["Client & Edge Ingress"]
        Browser["User / Admin Browser (React 19 SPA)"]
        PublicVisitor["Public Form Visitor"]
        Edge["Nginx Reverse Proxy / Load Balancer (:80)"]
    end

    subgraph ApiCluster ["API Cluster (apps/api - NestJS 11)"]
        Api1["API Instance 1 (:3000)"]
        Api2["API Instance 2 (:3000)"]
    end

    subgraph MonolithModules ["Modular Monolith Domains"]
        Identity["IdentityModule"]
        Forms["FormsModule"]
        Runtime["RuntimeModule"]
        Submissions["SubmissionsModule"]
        Administration["AdministrationModule"]
        Realtime["RealtimeModule"]
        Infrastructure["InfrastructureModule (Vault, Redis, Storage, Queue, Audit)"]
    end

    subgraph StateAndSecurity ["Stateful & Security Infrastructure"]
        MongoDB[("MongoDB (saas_db)")]
        Redis[("Redis (Pub/Sub, Queue)")]
        Vault[("HashiCorp Vault")]
        Storage[("MinIO / S3 Object Storage")]
    end

    Browser -->|HTTP / WS| Edge
    PublicVisitor -->|HTTP| Edge
    Edge --> Api1
    Edge --> Api2

    Api1 -.-> MonolithModules
    Api2 -.-> MonolithModules

    Infrastructure --> MongoDB
    Infrastructure --> Redis
    Infrastructure --> Vault
    Infrastructure --> Storage
    Realtime <-->|Pub/Sub Adapter| Redis
```

---

## 2. Core Package Responsibilities

1. **`apps/web`**: Single-page application built with React 19, TypeScript, and Vite 6. Renders user workspaces, admin console, form builder canvas, and public form runtime.
2. **`apps/api`**: NestJS 11 modular monolith providing REST endpoints and Socket.IO real-time services.
3. **`packages/shared`**: Leaf contract layer containing canonical TypeScript interfaces, DTOs, enums (`Role`, `UserStatus`, `Permission`), and Form AST types.
