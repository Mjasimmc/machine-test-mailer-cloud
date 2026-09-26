# Operations: Backup Strategy & Point-in-Time Recovery

> **Scope**: Database backup lifecycle, snapshots, oplog point-in-time recovery, object storage backups, and retention rules.  
> **Source of Truth**: Database schema definitions and infrastructure operations.  
> **Last Verified**: 2026-09-25

---

## 1. Backup Strategy Overview

Authoritative application state resides exclusively in MongoDB. Binary artifacts reside in object storage.

| Component | Backup Type | Frequency | Target Storage | Retention Policy |
|---|---|---|---|---|
| **MongoDB State** | Full Snapshot (`mongodump`) | Every 24 hours | Encrypted S3/Cloud Storage | 30 days daily, 12 months monthly |
| **MongoDB Oplog** | Continuous Oplog Archival | Continuous / 5 min | Independent Cloud Bucket | 7 days (enables PITR) |
| **Object Storage** | Bucket Versioning + Sync | Continuous versioning | Cross-Region S3 Replica | 90 days retention |
| **Vault State** | Encrypted Raft Snapshot | Daily | Private Secure Storage | 30 days |
| **Redis** | Transient State (AOF/RDB) | Ephemeral / Daily | Local volume | 3 days |

---

## 2. Point-in-Time Recovery (PITR) Procedure

MongoDB Point-in-Time Recovery enables restoration to any specific timestamp within the oplog retention window:

1. **Restore Baseline Snapshot**:
   ```bash
   mongorestore --drop --gzip --archive=/backups/mongodb-snapshot-baseline.gz
   ```
2. **Replay Oplog to Target Timestamp**:
   ```bash
   mongorestore --oplogReplay --oplogLimit="<timestamp>:1" /backups/oplog/
   ```
3. **Verify Integrity & Re-index**:
   * Verify collection counts (`users`, `forms`, `formversions`, `formsubmissions`).
   * Compound indexes automatically reconstruct during restore.
