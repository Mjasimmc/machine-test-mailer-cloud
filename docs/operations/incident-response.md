# Operations: Incident Response & Recovery

> **Scope**: Failure scenarios, database recovery, and emergency account restoration.  
> **Source of Truth**: `apps/api/src/seed.ts` and system operations.  
> **Last Verified**: 2026-09-25

---

## 1. Common Incident Scenarios & Remediation

### Scenario A: Admin Account Locked or Lost
- **Remedy**: Re-run the database seeder to restore/reset the administrator credentials configured in `.env`:
  ```bash
  pnpm seed
  ```

### Scenario B: Database Connection Failure
- **Symptom**: API throws `MongooseServerSelectionError` on startup or requests.
- **Remedy**:
  1. Verify local MongoDB is running (`mongod` service or container).
  2. Verify `MONGODB_URI` in `apps/api/.env`.
  3. Restart the API process.

### Scenario C: WebSocket Disconnections During Traffic Spikes
- **Symptom**: Users suspended by admin remain active in UI.
- **Remedy**: `ActiveUserGuard` continues to protect all backend HTTP requests regardless of socket state. Restart API or check network firewall rules for WebSocket port 3000.
