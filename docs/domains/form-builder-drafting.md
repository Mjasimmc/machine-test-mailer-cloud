# Domain: Form Builder & Drafting

> **Scope**: Hierarchical schema AST (Sections $\to$ Zones $\to$ Elements), properties configuration, and continuous draft autosave.  
> **Source of Truth**: [`packages/shared/src/types/form.ts`](file:///home/sct/dd/multi-tenant-form-builder/packages/shared/src/types/form.ts) and [`apps/web/src/features/forms/builder/`](file:///home/sct/dd/multi-tenant-form-builder/apps/web/src/features/forms/builder/).  
> **Last Verified**: 2026-09-25

---

## 1. Hierarchical Form Schema Structure

```text
Form Document (Form collection)
 └── FormDraft (Embedded document)
      ├── title: string
      ├── formLayout: 'column' | 'row'
      ├── customCss: string
      └── sections: FormSection[]
           ├── id, title, description, customWidth, customHeight
           └── zones: FormZone[]
                ├── id, name, columns, customWidth, customHeight
                └── elements: FormElement[]
                     ├── id, type, label, name, reference, placeholder, required
                     ├── validation: { enabled, pattern, errorMessage }
                     ├── options: Option[] (for select/radio/checkbox)
                     └── customWidth, customHeight
```

---

## 2. Selection Hierarchy & Dimensions Invariants

1. **Selection Drill-down**:
   - Level 1: Form root settings
   - Level 2: Section selection
   - Level 3: Zone selection
   - Level 4: Element / Field selection
2. **Dimension Constraints**:
   - Width and height properties (`customWidth`, `customHeight`) support preset units (`100%`, `75%`, `50%`, `33%`, `25%`, or custom values like `450px`).
   - All renderers enforce `maxWidth: 100%` and `boxSizing: border-box` to prevent canvas or viewport horizontal overflow.
3. **Draft Independence (`PATCH /forms/:id/draft`)**:
   - Updates `Form.draft` without publishing or altering any active `FormVersion`.
   - Public visitors only see the immutable version snapshot deployed under `deployedVersionId`.
