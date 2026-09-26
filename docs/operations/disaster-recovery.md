# Operations: Disaster Recovery & Failover Plan

> **Scope**: RPO, RTO, failure recovery procedures, regional failover, and restore testing protocols.  
> **Source of Truth**: System topology and operational resilience policies.  
> **Last Verified**: 2026-09-25

---

## 1. Objectives: RPO & RTO

* **Recovery Point Objective (RPO)**: **< 5 minutes** (via continuous MongoDB oplog replication).
* **Recovery Time Objective (RTO)**: **< 30 minutes** (time to spin up replacement API instances and promote secondary database).

---

## 2. Recovery Procedures by Component

### A. Primary Database (MongoDB) Failure
1. **Replica Set Auto-Failover**:
   * If Primary node fails, Secondary nodes hold an election and promote a new Primary within 10–15 seconds.
   * API connection pools automatically discover the new primary via replica set connection string.
2. **Catastrophic Cluster Loss**:
   * Deploy new MongoDB cluster in secondary region.
   * Restore latest snapshot and replay oplog (see [`backups.md`](file:///home/sct/dd/multi-tenant-form-builder/docs/operations/backups.md)).
   * Update API `MONGODB_URI` via Vault or deployment environment config.

### B. Redis Cluster Failure
* **Impact**: Temporary loss of Socket.IO cross-instance broadcasting and job queues.
* **Recovery**:
  * API automatically falls back to in-memory Socket.IO adapter and in-process queue execution.
  * Re-provision Redis container/cluster; ioredis reconnects automatically.

### C. HashiCorp Vault Failure
* **Production**: Vault is configured with multi-node Raft storage HA. If active node crashes, standby node is promoted.
* **Disaster Recovery**: Restore encrypted Raft snapshot to fresh Vault instance.

---

## 3. Scheduled Restore Testing

* Backups are automatically restored to an isolated testing database on the 1st of every month.
* Automated integrity test checks schema validity, record counts, and runs the E2E verification suite against restored data.
