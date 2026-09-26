# Development: Initial Setup Guide

> **Scope**: Developer environment setup, prerequisite installation, and database initialization.  
> **Source of Truth**: Workspace root configuration and scripts.  
> **Last Verified**: 2026-09-24

---

## 1. Prerequisites

1. **Node.js**: Install Node.js version `>= 20.0.0`.
2. **pnpm**: Install pnpm version `>= 9.0.0`:
   ```bash
   npm install -g pnpm
   ```
3. **MongoDB**: Install and run MongoDB locally on default port `27017` or obtain a MongoDB Atlas URI.

---

## 2. Installation Steps

1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Configure environment files:
   - Copy `apps/api/.env.example` to `apps/api/.env`
   - Copy `apps/web/.env.example` to `apps/web/.env`
3. Seed default admin and sample data:
   ```bash
   pnpm seed
   ```
