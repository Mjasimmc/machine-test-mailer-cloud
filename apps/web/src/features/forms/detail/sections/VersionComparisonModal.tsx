import React, { useState, useMemo } from 'react';
import { FormDto, FormElement, FormVersionDto, isDataField } from '@saas/shared';
import { Badge, Button, Dialog } from '../../../../components';

interface VersionComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: FormDto;
  initialSourceVersionId?: string;
  initialTargetVersionId?: string;
  onDeployVersion?: (versionId: string) => Promise<void>;
}

interface FieldDiffItem {
  id: string;
  reference: string;
  labelA?: string;
  labelB?: string;
  typeA?: string;
  typeB?: string;
  requiredA?: boolean;
  requiredB?: boolean;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  changes: string[];
}

export const VersionComparisonModal: React.FC<VersionComparisonModalProps> = ({
  isOpen,
  onClose,
  form,
  initialSourceVersionId,
  initialTargetVersionId,
  onDeployVersion,
}) => {
  const versions = form.versions || [];
  const deployedVersionId = form.deployedVersionId;

  // By default: Version A is latest draft (or initialSource), Version B is deployed (or initialTarget)
  const defaultVersionAId =
    initialSourceVersionId ||
    (versions.length > 0 ? versions[versions.length - 1].id : '');
  const defaultVersionBId =
    initialTargetVersionId ||
    deployedVersionId ||
    (versions.length > 1 ? versions[0].id : defaultVersionAId);

  const [versionAId, setVersionAId] = useState<string>(defaultVersionAId);
  const [versionBId, setVersionBId] = useState<string>(defaultVersionBId);
  const [filterDiff, setFilterDiff] = useState<'all' | 'changes_only'>('changes_only');

  const versionA = versions.find((v) => v.id === versionAId) || versions[versions.length - 1];
  const versionB = versions.find((v) => v.id === versionBId) || versions[0];

  // Helper to extract fields dictionary by reference/id
  const getFieldsMap = (version?: FormVersionDto) => {
    const map = new Map<string, FormElement>();
    if (!version) return map;

    const allElements: FormElement[] = [];
    if (version.sections && version.sections.length > 0) {
      for (const s of version.sections) {
        for (const z of s.zones || []) {
          for (const el of z.elements || []) {
            allElements.push(el);
          }
        }
      }
    } else if (version.elements && version.elements.length > 0) {
      allElements.push(...version.elements);
    }

    allElements.forEach((el) => {
      const key = (el.reference || el.id).trim().toLowerCase();
      map.set(key, el);
      if (el.id) {
        map.set(el.id.trim().toLowerCase(), el);
      }
    });
    return map;
  };

  // Compute field-by-field diff
  const comparison = useMemo(() => {
    if (!versionA || !versionB) {
      return {
        added: [],
        removed: [],
        modified: [],
        unchanged: [],
        layoutChanged: false,
        titleChanged: false,
        cssChanged: false,
      };
    }

    const mapA = getFieldsMap(versionA); // e.g. New Draft
    const mapB = getFieldsMap(versionB); // e.g. Production Deployed

    const added: FieldDiffItem[] = [];
    const removed: FieldDiffItem[] = [];
    const modified: FieldDiffItem[] = [];
    const unchanged: FieldDiffItem[] = [];

    // Check items in Version A compared to Version B
    mapA.forEach((elA, key) => {
      const elB = mapB.get(key);
      const isInteractive = isDataField(elA.type);

      if (!elB) {
        // Exists in A but not in B -> Added
        added.push({
          id: elA.id,
          reference: elA.reference || elA.id,
          labelA: elA.label || elA.name || elA.content || elA.id,
          typeA: elA.type,
          requiredA: !!elA.required,
          status: 'added',
          changes: [`Added new ${isInteractive ? 'interactive' : 'layout'} field`],
        });
      } else {
        // Exists in both -> Check for modifications
        const changes: string[] = [];
        if (elA.type !== elB.type) {
          changes.push(`Type changed from "${elB.type}" to "${elA.type}"`);
        }
        if (!!elA.required !== !!elB.required) {
          changes.push(
            `Requirement changed to ${elA.required ? 'Required' : 'Optional'}`,
          );
        }
        const labelA = elA.label || elA.name || elA.content || elA.id;
        const labelB = elB.label || elB.name || elB.content || elB.id;
        if (labelA !== labelB) {
          changes.push(`Label renamed from "${labelB}" to "${labelA}"`);
        }
        if (JSON.stringify(elA.options || []) !== JSON.stringify(elB.options || [])) {
          changes.push('Select/radio choices were updated');
        }
        if (
          elA.validation?.pattern !== elB.validation?.pattern ||
          elA.validation?.enabled !== elB.validation?.enabled
        ) {
          changes.push('Validation pattern/rules changed');
        }

        const item: FieldDiffItem = {
          id: elA.id,
          reference: elA.reference || elA.id,
          labelA,
          labelB,
          typeA: elA.type,
          typeB: elB.type,
          requiredA: !!elA.required,
          requiredB: !!elB.required,
          status: changes.length > 0 ? 'modified' : 'unchanged',
          changes,
        };

        if (changes.length > 0) {
          modified.push(item);
        } else {
          unchanged.push(item);
        }
      }
    });

    // Check items in Version B that are missing in Version A -> Removed
    mapB.forEach((elB, key) => {
      if (!mapA.has(key)) {
        removed.push({
          id: elB.id,
          reference: elB.reference || elB.id,
          labelB: elB.label || elB.name || elB.content || elB.id,
          typeB: elB.type,
          requiredB: !!elB.required,
          status: 'removed',
          changes: ['Field was deleted from draft'],
        });
      }
    });

    const layoutChanged = versionA.formLayout !== versionB.formLayout;
    const titleChanged = versionA.title !== versionB.title;
    const cssChanged = (versionA.customCss || '') !== (versionB.customCss || '');

    return {
      added,
      removed,
      modified,
      unchanged,
      layoutChanged,
      titleChanged,
      cssChanged,
    };
  }, [versionA, versionB]);

  const hasDifferences =
    comparison.added.length > 0 ||
    comparison.removed.length > 0 ||
    comparison.modified.length > 0 ||
    comparison.layoutChanged ||
    comparison.titleChanged ||
    comparison.cssChanged;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Version Comparison"
      className="version-comparison-dialog"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            {versionA?.id !== deployedVersionId && onDeployVersion && (
              <Button
                variant="primary"
                onClick={() => {
                  onDeployVersion(versionA.id);
                  onClose();
                }}
                id="comparison-deploy-a-btn"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-icon" style={{ fontSize: '16px' }}>rocket_launch</span>
                  Deploy Version {versionA.versionNumber} to Live Production
                </span>
              </Button>
            )}
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="version-comparison-body">
        {/* Version Pickers Header */}
        <div className="version-comparison__selectors">
          <div className="version-comparison__col-picker">
            <span className="picker-label">Comparing (Version A):</span>
            <select
              value={versionAId}
              onChange={(e) => setVersionAId(e.target.value)}
              className="version-comparison__select"
              id="select-version-a"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.versionNumber} {v.id === deployedVersionId ? '(LIVE)' : '(Draft)'} — {v.title}
                </option>
              ))}
            </select>
          </div>

          <div className="version-comparison__vs-pill">VS</div>

          <div className="version-comparison__col-picker">
            <span className="picker-label">Base / Reference (Version B):</span>
            <select
              value={versionBId}
              onChange={(e) => setVersionBId(e.target.value)}
              className="version-comparison__select"
              id="select-version-b"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.versionNumber} {v.id === deployedVersionId ? '(DEPLOYED LIVE)' : '(Draft)'} — {v.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Change Metrics Summary Badges */}
        <div className="version-comparison__summary-bar">
          <div className="summary-pill added">
            <span>+{comparison.added.length} Added</span>
          </div>
          <div className="summary-pill removed">
            <span>-{comparison.removed.length} Removed</span>
          </div>
          <div className="summary-pill modified">
            <span>~{comparison.modified.length} Changed</span>
          </div>
          <div className="summary-pill unchanged">
            <span>={comparison.unchanged.length} Identical</span>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className={`filter-btn ${filterDiff === 'changes_only' ? 'active' : ''}`}
              onClick={() => setFilterDiff('changes_only')}
            >
              Diff Only
            </button>
            <button
              type="button"
              className={`filter-btn ${filterDiff === 'all' ? 'active' : ''}`}
              onClick={() => setFilterDiff('all')}
            >
              All Fields
            </button>
          </div>
        </div>

        {/* Global Configurations Diff */}
        {(comparison.titleChanged || comparison.layoutChanged || comparison.cssChanged) && (
          <div className="version-comparison__config-diff">
            <strong>Form Settings & Layout Changes:</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.85rem' }}>
              {comparison.titleChanged && (
                <li>
                  Title: changed from <em>"{versionB?.title}"</em> to <strong>"{versionA?.title}"</strong>
                </li>
              )}
              {comparison.layoutChanged && (
                <li>
                  Form Layout: changed from <code>{versionB?.formLayout}</code> to <code>{versionA?.formLayout}</code>
                </li>
              )}
              {comparison.cssChanged && (
                <li>Custom CSS styling definitions were modified between versions.</li>
              )}
            </ul>
          </div>
        )}

        {/* Diff Result List */}
        {!hasDifferences ? (
          <div className="version-comparison__empty-identical">
            <span className="material-icon" style={{ fontSize: '36px', color: 'var(--color-success)' }}>
              check_circle
            </span>
            <h4>Versions are structurally identical</h4>
            <p>All field names, requirements, and validation rules match exactly.</p>
          </div>
        ) : (
          <div className="version-comparison__diff-list">
            {/* 1. Added Fields */}
            {comparison.added.map((item) => (
              <div key={item.id} className="diff-card diff-card--added">
                <div className="diff-card__badge">
                  <Badge variant="success" size="small">
                    + Added
                  </Badge>
                </div>
                <div className="diff-card__content">
                  <div className="diff-card__field-name">
                    <strong>{item.labelA}</strong>
                  </div>
                  <div className="diff-card__details">
                    Type: <Badge variant="neutral" size="small">{item.typeA}</Badge>
                    {item.requiredA ? <span className="req-badge">Required</span> : <span className="opt-badge">Optional</span>}
                  </div>
                </div>
              </div>
            ))}

            {/* 2. Removed Fields */}
            {comparison.removed.map((item) => (
              <div key={item.id} className="diff-card diff-card--removed">
                <div className="diff-card__badge">
                  <Badge variant="danger" size="small">
                    - Removed
                  </Badge>
                </div>
                <div className="diff-card__content">
                  <div className="diff-card__field-name">
                    <strong>{item.labelB}</strong>
                  </div>
                  <div className="diff-card__details">
                    Was in Base (v{versionB?.versionNumber}), missing in v{versionA?.versionNumber}
                  </div>
                </div>
              </div>
            ))}

            {/* 3. Modified Fields */}
            {comparison.modified.map((item) => (
              <div key={item.id} className="diff-card diff-card--modified">
                <div className="diff-card__badge">
                  <Badge variant="warning" size="small">
                    ~ Modified
                  </Badge>
                </div>
                <div className="diff-card__content">
                  <div className="diff-card__field-name">
                    <strong>{item.labelA}</strong>
                  </div>
                  <ul className="diff-card__changes-list">
                    {item.changes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            {/* 4. Unchanged Fields (if filter is 'all') */}
            {filterDiff === 'all' &&
              comparison.unchanged.map((item) => (
                <div key={item.id} className="diff-card diff-card--unchanged">
                  <div className="diff-card__badge">
                    <Badge variant="neutral" size="small">
                      = Identical
                    </Badge>
                  </div>
                  <div className="diff-card__content">
                    <div className="diff-card__field-name">
                      <span>{item.labelA}</span>
                    </div>
                    <div className="diff-card__details">
                      Type: {item.typeA} · {item.requiredA ? 'Required' : 'Optional'}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </Dialog>
  );
};
