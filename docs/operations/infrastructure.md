# Operations: Infrastructure Requirements

> **Scope**: Host machine requirements, database dependencies, and network architecture.  
> **Source of Truth**: Workspace configuration and runtime dependencies.  
> **Last Verified**: 2026-09-24

---

## 1. System Requirements

- **Node.js Runtime**: `>= 20.0.0`
- **Package Manager**: `pnpm >= 9.0.0`
- **Database**: MongoDB 6.x or 7.x (Standalone or Replica Set / Atlas cluster)
- **Memory**: Minimum 1GB RAM for dev server; 2GB+ recommended for production Node.js processes.

---

## 2. Network & Port Allocation

- **Port 3000**: API Server (Express HTTP and Socket.IO WebSocket endpoints).
- **Port 5173**: Web Frontend (Vite development server).
- **Port 27017**: MongoDB standard listening port.
