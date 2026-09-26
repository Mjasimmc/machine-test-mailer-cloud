import React, { useState, useMemo } from 'react';
import {
  FormDto,
  FormElement,
  FormSection,
  isDataField,
} from '@saas/shared';
import { Badge, Input } from '../../../../components';

interface FieldsSectionProps {
  form: FormDto;
}

interface FlattenedFieldItem {
  id: string;
  order: number;
  label: string;
  name: string;
  reference: string;
  type: string;
  dataType?: string;
  required: boolean;
  sectionName: string;
  sectionTitle?: string;
  validationRule?: string;
  optionsCount?: number;
  defaultValue?: any;
  isInteractive: boolean;
}

export const FieldsSection: React.FC<FieldsSectionProps> = ({ form }) => {
  const versions = form.versions || [];
  const deployedVersionId = form.deployedVersionId;

  // Selected version for schema inspection (default to deployed version, or latest version)
  const defaultVersionId =
    deployedVersionId || (versions.length > 0 ? versions[versions.length - 1].id : '');
  const [selectedVersionId, setSelectedVersionId] = useState<string>(defaultVersionId);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRequired, setFilterRequired] = useState<string>('all');

  const selectedVersion =
    versions.find((v) => v.id === selectedVersionId) ||
    versions[versions.length - 1] ||
    null;

  // Flatten elements with structural section context
  const flattenedFields: FlattenedFieldItem[] = useMemo(() => {
    if (!selectedVersion) return [];

    const result: FlattenedFieldItem[] = [];
    let fieldOrder = 1;

    if (selectedVersion.sections && selectedVersion.sections.length > 0) {
      selectedVersion.sections.forEach((sec: FormSection, sIdx: number) => {
        const secName = sec.name || `Section ${sIdx + 1}`;
        const secTitle = sec.title;
        (sec.zones || []).forEach((zone) => {
          (zone.elements || []).forEach((el: FormElement) => {
            const isInteractive = isDataField(el.type);
            result.push({
              id: el.id,
              order: fieldOrder++,
              label: el.label || el.name || el.content || el.id,
              name: el.name || el.label || el.id,
              reference: el.reference || el.id,
              type: el.type,
              dataType: el.dataType,
              required: !!el.required,
              sectionName: secName,
              sectionTitle: secTitle,
              validationRule: el.validation?.enabled && el.validation?.pattern ? el.validation.pattern : undefined,
              optionsCount: el.options?.length,
              defaultValue: el.defaultValue,
              isInteractive,
            });
          });
        });
      });
    } else if (selectedVersion.elements && selectedVersion.elements.length > 0) {
      selectedVersion.elements.forEach((el: FormElement) => {
        const isInteractive = isDataField(el.type);
        result.push({
          id: el.id,
          order: fieldOrder++,
          label: el.label || el.name || el.content || el.id,
          name: el.name || el.label || el.id,
          reference: el.reference || el.id,
          type: el.type,
          dataType: el.dataType,
          required: !!el.required,
          sectionName: 'Default Section',
          validationRule: el.validation?.enabled && el.validation?.pattern ? el.validation.pattern : undefined,
          optionsCount: el.options?.length,
          defaultValue: el.defaultValue,
          isInteractive,
        });
      });
    }

    return result;
  }, [selectedVersion]);

  // Filtered fields based on search and filters
  const filteredFields = useMemo(() => {
    return flattenedFields.filter((item) => {
      // Type filter
      if (filterType === 'interactive' && !item.isInteractive) return false;
      if (filterType === 'layout' && item.isInteractive) return false;

      // Required filter
      if (filterRequired === 'required' && !item.required) return false;
      if (filterRequired === 'optional' && item.required) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = item.label.toLowerCase().includes(q);
        const matchesType = item.type.toLowerCase().includes(q);
        const matchesSec = item.sectionName.toLowerCase().includes(q);
        return matchesLabel || matchesType || matchesSec;
      }

      return true;
    });
  }, [flattenedFields, searchQuery, filterType, filterRequired]);

  const interactiveCount = flattenedFields.filter((f) => f.isInteractive).length;
  const requiredCount = flattenedFields.filter((f) => f.required).length;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text':
      case 'textarea':
        return 'primary';
      case 'email':
      case 'phone':
        return 'info';
      case 'number':
        return 'warning';
      case 'date':
        return 'neutral';
      case 'select':
      case 'radio':
      case 'checkbox':
        return 'success';
      case 'file':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="form-detail-fields" id="section-fields">
      {/* 1. Header with Controls */}
      <div className="form-detail-fields__header-bar">
        <div>
          <h3 className="form-detail-fields__title">Form Fields Schema</h3>
          <p className="form-detail-fields__subtitle">
            Read-only structural view of all fields defined in the schema. Source of truth for database columns and validation.
          </p>
        </div>

        {/* Version Selector */}
        <div className="form-detail-fields__version-selector">
          <label htmlFor="fields-version-select">Inspect Version:</label>
          <select
            id="fields-version-select"
            value={selectedVersionId}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            className="form-detail-fields__select"
          >
            {versions.map((v) => {
              const isDep = v.id === deployedVersionId || v.isDeployed;
              return (
                <option key={v.id} value={v.id}>
                  Version {v.versionNumber} {isDep ? '(DEPLOYED)' : '(Draft)'} — {v.title}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* 2. Stat Counts Bar */}
      <div className="form-detail-fields__stats-bar">
        <div className="form-detail-fields__stat-pill">
          <span>Total Elements:</span>
          <strong>{flattenedFields.length}</strong>
        </div>
        <div className="form-detail-fields__stat-pill">
          <span>Data Fields:</span>
          <strong>{interactiveCount}</strong>
        </div>
        <div className="form-detail-fields__stat-pill">
          <span>Required Fields:</span>
          <strong>{requiredCount}</strong>
        </div>
        <div className="form-detail-fields__stat-pill">
          <span>Optional Fields:</span>
          <strong>{interactiveCount - requiredCount}</strong>
        </div>
      </div>

      {/* 3. Search and Filters */}
      <div className="form-detail-fields__filter-row">
        <div style={{ flex: '1', minWidth: '240px' }}>
          <Input
            id="search-fields-input"
            placeholder="Search fields by name, type, or section..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="form-detail-fields__filter-actions">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="form-detail-fields__filter-select"
            id="filter-type-select"
          >
            <option value="all">All Elements</option>
            <option value="interactive">Interactive Data Fields Only</option>
            <option value="layout">Layout / Non-interactive Only</option>
          </select>

          <select
            value={filterRequired}
            onChange={(e) => setFilterRequired(e.target.value)}
            className="form-detail-fields__filter-select"
            id="filter-required-select"
          >
            <option value="all">Required & Optional</option>
            <option value="required">Required Only</option>
            <option value="optional">Optional Only</option>
          </select>
        </div>
      </div>

      {/* 4. Table of Fields */}
      <div className="form-detail-fields__table-container">
        <table className="form-detail-fields__table" id="fields-structural-table">
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>#</th>
              <th style={{ width: '240px' }}>Field Label</th>
              <th style={{ width: '120px' }}>Type</th>
              <th style={{ width: '110px' }}>Requirement</th>
              <th style={{ width: '180px' }}>Section / Group</th>
              <th>Configuration / Validation Rules</th>
            </tr>
          </thead>
          <tbody>
            {filteredFields.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                  No fields match the current query or filter criteria.
                </td>
              </tr>
            ) : (
              filteredFields.map((field) => (
                <tr key={field.id} className={!field.isInteractive ? 'is-layout-element' : ''}>
                  <td style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>
                    {field.order}
                  </td>
                  <td>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                      {field.label}
                    </div>
                  </td>
                  <td>
                    <Badge variant={getTypeColor(field.type) as any} size="small">
                      {field.type}
                    </Badge>
                  </td>
                  <td>
                    {field.isInteractive ? (
                      field.required ? (
                        <span className="form-detail-fields__badge-required">Required</span>
                      ) : (
                        <span className="form-detail-fields__badge-optional">Optional</span>
                      )
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {field.sectionName}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {field.validationRule && (
                        <span className="form-detail-fields__rule-tag" title={`Regex: ${field.validationRule}`}>
                          Pattern: <code>{field.validationRule}</code>
                        </span>
                      )}
                      {field.optionsCount !== undefined && field.optionsCount > 0 && (
                        <span className="form-detail-fields__rule-tag">
                          {field.optionsCount} Options
                        </span>
                      )}
                      {field.defaultValue !== undefined && field.defaultValue !== '' && (
                        <span className="form-detail-fields__rule-tag">
                          Default: {String(field.defaultValue)}
                        </span>
                      )}
                      {!field.validationRule && (!field.optionsCount) && (
                        <span style={{ color: 'var(--color-text-muted)' }}>Standard configuration</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
