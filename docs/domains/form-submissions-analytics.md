# Domain: Form Submissions & Analytics

> **Scope**: Public submission intake, payload limits, ReDoS-safe validation, asynchronous notifications, and multi-version data projection.  
> **Source of Truth**: [`apps/api/src/submissions/`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/submissions/) and [`apps/api/src/forms/schemas/form-submission.schema.ts`](file:///home/sct/dd/multi-tenant-form-builder/apps/api/src/forms/schemas/form-submission.schema.ts).  
> **Last Verified**: 2026-09-25

---

## 1. Submission Intake Lifecycle (`POST /public/forms/:publicId/submissions`)

1. **Resolution**: Public ID is resolved to the target `Form` document.
2. **Deployment Guard**: Verifies `deployedVersionId` is not null. Undeployed forms reject submissions with HTTP 400.
3. **Availability & Limits**: Checks `settings.isAcceptingSubmissions !== false` and verifies `submissionLimit`.
4. **Anti-Abuse Payload Validation**:
   * Rejects payloads with > 200 fields.
   * Enforces max 50,000 characters per string value.
   * Strips/blocks prototype pollution keys (`__proto__`, `constructor`, `prototype`).
5. **Schema Validation**:
   * Evaluates `required` constraints against the deployed immutable version AST.
   * Runs `safeRegexTest` for fields with regex validation, eliminating ReDoS backtracking risks.
6. **Immutable Persistence**:
   * Persists `FormSubmission` permanently linked to `formId`, `versionId`, and `tenantId`.
7. **Asynchronous Webhook Notification**:
   * If `settings.webhookUrl` is configured, dispatches job to `QueueService` without blocking the HTTP response.

---

## 2. Multi-Version Data Table Projection (`GET /forms/:id/data`)

1. **Master Column Set**:
   * Queries all `FormVersion` records ever deployed for this form.
   * Aggregates a cumulative master set of column definitions (`FormDataColumnDto[]`).
2. **Historical Projection**:
   * Maps each submission row against the master column list.
   * For versions where a field was added later or previously deleted, projects empty string `""` without corrupting or dropping historical answers.
3. **CSV Export (`GET /forms/:id/data?format=csv`)**:
   * Streams RFC 4180-compliant CSV output with escaped headers and values.
