# Architecture: Data Flow

> **Scope**: End-to-end data flows for Form Autosaving, Version Deployment, and Public Submissions.  
> **Source of Truth**: Implementation across `apps/api/src/forms/`, `apps/api/src/submissions/`, and `apps/web/src/features/forms/`.  
> **Last Verified**: 2026-09-25

---

## 1. Continuous Draft Autosaving Flow

```mermaid
sequenceDiagram
    actor Creator as Form Creator
    participant Editor as Form Editor (React)
    participant API as FormsController
    participant Service as FormsService
    participant DB as MongoDB (forms)

    Creator->>Editor: Updates element label / adds zone
    Editor->>API: PATCH /forms/:id/draft { title, elements, sections, ... }
    API->>Service: updateDraft(userId, formId, dto, tenantId)
    Service->>Service: Validate ownership (form.userId === userId && form.tenantId === tenantId)
    Service->>DB: Update form.draft & form.updatedAt
    DB-->>Service: Saved
    Service-->>API: Return updated FormDto
    API-->>Editor: 200 OK (hasUnpublishedChanges = true)
```

---

## 2. Release Deployment & Concurrency-Safe Snapshotting Flow

```mermaid
sequenceDiagram
    actor Creator as Form Creator
    participant Editor as Form Editor (React)
    participant API as FormsController
    participant Service as FormsService
    participant VModel as MongoDB (formversions)
    participant FModel as MongoDB (forms)
    participant Audit as AuditService

    Creator->>Editor: Clicks "Deploy Form"
    Editor->>API: POST /forms/:id/deploy
    API->>Service: deployDraft(userId, formId, tenantId)
    Service->>Service: Validate ownership & uniqueness of field references
    loop Atomic Retry Loop (max 3 attempts)
        Service->>VModel: Query latest versionNumber -> next is N + 1
        Service->>VModel: Create FormVersion (frozen immutable snapshot)
    end
    Service->>FModel: Update form.deployedVersionId = newVersion._id
    Service->>FModel: Prepend activity & deployment record
    Service->>Audit: Log form:deploy event
    FModel-->>Service: Updated
    Service-->>API: Return updated FormDto
    API-->>Editor: 200 OK (hasUnpublishedChanges = false)
```

---

## 3. Public Form Submission Flow

```mermaid
sequenceDiagram
    actor Submitter as Public Visitor
    participant Page as PublicFormView (/f/:publicId)
    participant API as SubmissionsController
    participant Service as SubmissionsService
    participant DB as MongoDB (formsubmissions)
    participant Queue as QueueService

    Submitter->>Page: Fills out form and clicks Submit
    Page->>API: POST /public/forms/:publicId/submissions { data }
    API->>Service: submit(publicId, dto)
    Service->>Service: Look up Form by publicId & verify deployedVersionId exists
    Service->>Service: Payload bounds check (max 200 fields, 50KB strings)
    Service->>Service: safeRegexTest on validated fields
    Service->>DB: Create FormSubmission { formId, tenantId, versionId, data }
    DB-->>Service: Created submission record
    opt Webhook configured
        Service->>Queue: Dispatch 'webhook_notification' asynchronously
    end
    Service-->>API: Return { message: "Submission received successfully", id: submission._id }
    API-->>Page: 201 Created
```
