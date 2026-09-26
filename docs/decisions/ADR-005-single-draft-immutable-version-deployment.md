# ADR-005: Single Form / Single Draft / Immutable Versioning Lifecycle

## Status
Accepted

## Context
Form builders can easily become over-complicated if they attempt to support multiple concurrent drafts, branching draft histories, or mutable published schemas. In contrast, changing published schemas directly corrupts historical submission data.

## Decision
Enforce a **Single Form, Single Continuous Draft, and Immutable Versioning** lifecycle model:
1. Every Form maintains exactly one mutable draft stored in `Form.draft`.
2. Edits autosave directly to `Form.draft` without creating new versions.
3. Deploying a draft snapshots the schema into a frozen `FormVersion` record with incremental `versionNumber`.
4. Submissions permanently reference the `versionId` deployed at the time of submission.

## Consequences
- **Positive**: Clean mental model for users; continuous autosave; zero risk of draft clutter; 100% historical fidelity for submissions.
- **Negative**: Reverting to an older version requires explicitly loading its snapshot into the active draft.

## Related Areas
- `apps/api/src/forms/forms.service.ts`
- `packages/shared/src/types/form.ts`
