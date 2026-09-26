import React, { useState } from 'react';
import {
  FormSection,
  FormZone,
  FormElement,
  LayoutDirection,
  ZoneWidthPreset,
  ZoneAlignment,
  HorizontalAlignment,
  VerticalAlignment,
  getZoneWidthPercent,
  generateReference,
  isDataField,
} from '@saas/shared';
import {
  FormField,
  FormLabel,
  Input,
  Select,
  Textarea,
  Button,
  Badge,
} from '../../../components';
import './PropertiesPanel.scss';

export type SelectionType =
  | { type: 'form' }
  | { type: 'section'; sectionId: string }
  | { type: 'zone'; sectionId: string; zoneId: string }
  | { type: 'element'; sectionId: string; zoneId: string; elementId: string }
  | null;

export interface PropertiesPanelProps {
  selection: SelectionType;
  formLayout: LayoutDirection;
  onUpdateFormLayout: (layout: LayoutDirection) => void;
  sections: FormSection[];
  onUpdateSections: (sections: FormSection[]) => void;
  onAddSection: () => void;
  onAddZone: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onDeleteZone: (sectionId: string, zoneId: string) => void;
  onDeleteElement: (sectionId: string, zoneId: string, elementId: string) => void;
  duplicateReferences?: string[];
  previewDevice?: 'desktop' | 'tablet' | 'mobile';
  onPreviewDeviceChange?: (device: 'desktop' | 'tablet' | 'mobile') => void;
  onClose?: () => void;
}

const WIDTH_PRESETS: { key: ZoneWidthPreset; label: string; percent: string }[] = [
  { key: 'full', label: 'Full', percent: '100%' },
  { key: 'three_quarters', label: '3/4', percent: '75%' },
  { key: 'two_thirds', label: '2/3', percent: '66.7%' },
  { key: 'half', label: 'Half', percent: '50%' },
  { key: 'one_third', label: '1/3', percent: '33.3%' },
  { key: 'one_quarter', label: '1/4', percent: '25%' },
  { key: 'custom', label: 'Custom', percent: '%' },
];

const ZONE_ALIGNMENTS: { key: ZoneAlignment; label: string; icon: string }[] = [
  { key: 'top-left', label: 'Top Left', icon: 'north_west' },
  { key: 'top-center', label: 'Top Center', icon: 'north' },
  { key: 'top-right', label: 'Top Right', icon: 'north_east' },
  { key: 'center-left', label: 'Center Left', icon: 'west' },
  { key: 'center', label: 'Center', icon: 'adjust' },
  { key: 'center-right', label: 'Center Right', icon: 'east' },
  { key: 'bottom-left', label: 'Bottom Left', icon: 'south_west' },
  { key: 'bottom-center', label: 'Bottom Center', icon: 'south' },
  { key: 'bottom-right', label: 'Bottom Right', icon: 'south_east' },
];

const HORIZONTAL_ALIGNMENTS: { key: HorizontalAlignment; label: string; icon: string }[] = [
  { key: 'start', label: 'Start', icon: 'align_horizontal_left' },
  { key: 'center', label: 'Center', icon: 'align_horizontal_center' },
  { key: 'end', label: 'End', icon: 'align_horizontal_right' },
  { key: 'space-between', label: 'Between', icon: 'space_bar' },
  { key: 'space-around', label: 'Around', icon: 'view_column' },
  { key: 'space-evenly', label: 'Evenly', icon: 'density_medium' },
];

const VERTICAL_ALIGNMENTS: { key: VerticalAlignment; label: string; icon: string }[] = [
  { key: 'start', label: 'Top', icon: 'align_vertical_top' },
  { key: 'center', label: 'Center', icon: 'align_vertical_center' },
  { key: 'end', label: 'Bottom', icon: 'align_vertical_bottom' },
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selection,
  formLayout,
  onUpdateFormLayout,
  sections,
  onUpdateSections,
  onAddSection,
  onAddZone,
  onDeleteSection,
  onDeleteZone,
  onDeleteElement,
  duplicateReferences: _duplicateReferences,
  previewDevice = 'desktop',
  onPreviewDeviceChange,
  onClose,
}) => {
  const [activeDeviceTab, setActiveDeviceTab] = useState<'desktop' | 'tablet' | 'mobile'>(previewDevice);

  // Sync internal device tab when external preview device changes
  React.useEffect(() => {
    if (previewDevice && previewDevice !== activeDeviceTab) {
      setActiveDeviceTab(previewDevice);
    }
  }, [previewDevice]);

  const handleDeviceTabClick = (dev: 'desktop' | 'tablet' | 'mobile') => {
    setActiveDeviceTab(dev);
    onPreviewDeviceChange?.(dev);
  };

  if (!selection) {
    return null;
  }

  // 1. FORM PROPERTIES
  if (selection.type === 'form') {
    return (
      <aside className="properties-drawer">
        <div className="properties-drawer__header">
          <div className="properties-drawer__header-title">
            <span className="material-icon">view_quilt</span>
            <span>Form Properties</span>
            <Badge variant="info" size="small">Form</Badge>
          </div>
          <div className="properties-drawer__header-actions">
            {onClose && (
              <button
                type="button"
                className="properties-drawer__close-btn"
                onClick={onClose}
                title="Close properties"
              >
                <span className="material-icon">close</span>
              </button>
            )}
          </div>
        </div>
        <div className="properties-drawer__body">
          <div className="properties-group">
            <FormLabel>Arrangement</FormLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => onUpdateFormLayout('column')}
                className="properties-compact-btn"
                style={{
                  backgroundColor: formLayout === 'column' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                  color: formLayout === 'column' ? '#fff' : 'var(--color-text-primary)',
                  border: `1px solid ${formLayout === 'column' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}
              >
                <span className="material-icon" style={{ fontSize: '15px' }}>view_stream</span>
                <span>Column</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateFormLayout('row')}
                className="properties-compact-btn"
                style={{
                  backgroundColor: formLayout === 'row' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                  color: formLayout === 'row' ? '#fff' : 'var(--color-text-primary)',
                  border: `1px solid ${formLayout === 'row' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}
              >
                <span className="material-icon" style={{ fontSize: '15px' }}>view_column</span>
                <span>Row</span>
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '500' }}>Total Sections</span>
              <Badge variant="neutral" size="small">{sections.length}</Badge>
            </div>
            <Button variant="secondary" size="small" style={{ width: '100%', height: '28px', fontSize: '12px' }} onClick={onAddSection}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icon" style={{ fontSize: '14px' }}>add</span>
                Add Section
              </span>
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  // 2. SECTION PROPERTIES
  if (selection.type === 'section') {
    let sectionIndex = sections.findIndex((s) => s.id === selection.sectionId);
    if (sectionIndex === -1 && sections.length > 0) {
      sectionIndex = 0;
    }
    const section = sections[sectionIndex];
    if (!section) return null;

    const handleUpdateSection = (updates: Partial<FormSection>) => {
      const copy = [...sections];
      copy[sectionIndex] = { ...copy[sectionIndex], ...updates };
      onUpdateSections(copy);
    };

    return (
      <aside className="properties-drawer">
        <div className="properties-drawer__header">
          <div className="properties-drawer__header-title">
            <span className="material-icon">dashboard</span>
            <span>Section #{sectionIndex + 1}</span>
            <Badge variant="info" size="small">Section</Badge>
          </div>
          <div className="properties-drawer__header-actions">
            {onClose && (
              <button
                type="button"
                className="properties-drawer__close-btn"
                onClick={onClose}
                title="Close properties"
              >
                <span className="material-icon">close</span>
              </button>
            )}
          </div>
        </div>
        <div className="properties-drawer__body">
          <div className="properties-group">
            <FormField style={{ margin: 0 }}>
              <FormLabel htmlFor="section-title">Section Title</FormLabel>
              <Input
                id="section-title"
                value={section.title || section.name || ''}
                onChange={(e) => handleUpdateSection({ title: e.target.value, name: e.target.value })}
                placeholder="Section title..."
                style={{ height: '30px', fontSize: '12px' }}
              />
            </FormField>
          </div>

          <div className="properties-group">
            <div>
              <FormLabel>Arrangement</FormLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleUpdateSection({ layout: 'row' })}
                  className="properties-compact-btn"
                  style={{
                    backgroundColor: section.layout === 'row' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                    color: section.layout === 'row' ? '#fff' : 'var(--color-text-primary)',
                    border: `1px solid ${section.layout === 'row' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  <span className="material-icon" style={{ fontSize: '15px' }}>view_column</span>
                  <span>Row</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateSection({ layout: 'column' })}
                  className="properties-compact-btn"
                  style={{
                    backgroundColor: section.layout === 'column' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                    color: section.layout === 'column' ? '#fff' : 'var(--color-text-primary)',
                    border: `1px solid ${section.layout === 'column' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  <span className="material-icon" style={{ fontSize: '15px' }}>view_stream</span>
                  <span>Column</span>
                </button>
              </div>
            </div>

            {/* Grid Columns */}
            <div style={{ marginTop: '6px' }}>
              <FormLabel>Columns</FormLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {[1, 2, 3, 4].map((col) => {
                  const isSelected = (section.columns || 1) === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handleUpdateSection({ columns: col })}
                      style={{
                        padding: '4px 0',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                        color: isSelected ? '#fff' : 'var(--color-text-primary)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: isSelected ? '600' : 'normal',
                        textAlign: 'center',
                      }}
                    >
                      {col} {col === 1 ? 'Col' : 'Cols'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Horizontal Alignment */}
            <div style={{ marginTop: '6px' }}>
              <FormLabel>Horizontal Align</FormLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {HORIZONTAL_ALIGNMENTS.map((align) => {
                  const isSelected = section.horizontalAlign === align.key;
                  return (
                    <button
                      key={align.key}
                      type="button"
                      onClick={() => handleUpdateSection({ horizontalAlign: align.key })}
                      style={{
                        padding: '4px 2px',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                        color: isSelected ? '#fff' : 'var(--color-text-primary)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1px',
                      }}
                    >
                      <span className="material-icon" style={{ fontSize: '13px' }}>{align.icon}</span>
                      <span>{align.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vertical Alignment */}
            <div style={{ marginTop: '6px' }}>
              <FormLabel>Vertical Align</FormLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {VERTICAL_ALIGNMENTS.map((align) => {
                  const isSelected = section.verticalAlign === align.key;
                  return (
                    <button
                      key={align.key}
                      type="button"
                      onClick={() => handleUpdateSection({ verticalAlign: align.key })}
                      style={{
                        padding: '4px 2px',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                        color: isSelected ? '#fff' : 'var(--color-text-primary)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1px',
                      }}
                    >
                      <span className="material-icon" style={{ fontSize: '13px' }}>{align.icon}</span>
                      <span>{align.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section Width & Height */}
            <div style={{ marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <FormLabel style={{ marginBottom: 0 }}>Section Width (Max 100%)</FormLabel>
                <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '600' }}>
                  {section.customWidth || '100%'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', marginBottom: '4px' }}>
                {['100%', '80%', '60%', '50%'].map((w) => {
                  const isSelected = (section.customWidth || '100%') === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleUpdateSection({ customWidth: w })}
                      style={{
                        padding: '3px 0',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                        color: isSelected ? '#fff' : 'var(--color-text-primary)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-xs, 2px)',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: isSelected ? '600' : 'normal',
                        textAlign: 'center',
                      }}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
              <Input
                value={section.customWidth || ''}
                onChange={(e) => handleUpdateSection({ customWidth: e.target.value })}
                placeholder="Width (e.g. 100%, 750px)"
                style={{ height: '26px', fontSize: '11px' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Button
              variant="secondary"
              size="small"
              onClick={() => onAddZone(section.id)}
              style={{ width: '100%', height: '28px', fontSize: '12px' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icon" style={{ fontSize: '14px' }}>add</span>
                Add Zone
              </span>
            </Button>

            <Button
              variant="danger"
              size="small"
              onClick={() => onDeleteSection(section.id)}
              style={{ width: '100%', height: '28px', fontSize: '12px' }}
            >
              Delete Section
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  // 3. ZONE PROPERTIES
  if (selection.type === 'zone') {
    let sectionIndex = sections.findIndex((s) => s.id === selection.sectionId);
    let zoneIndex = sectionIndex !== -1 ? sections[sectionIndex].zones.findIndex((z) => z.id === selection.zoneId) : -1;

    if (zoneIndex === -1) {
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const zIdx = sections[sIdx].zones.findIndex((z) => z.id === selection.zoneId);
        if (zIdx !== -1) {
          sectionIndex = sIdx;
          zoneIndex = zIdx;
          break;
        }
      }
    }

    if (sectionIndex === -1 || zoneIndex === -1) return null;
    const section = sections[sectionIndex];
    const zone = section.zones[zoneIndex];
    if (!zone) return null;

    const handleUpdateZone = (updates: Partial<FormZone>) => {
      const copy = [...sections];
      const secCopy = { ...copy[sectionIndex] };
      const zonesCopy = [...secCopy.zones];
      zonesCopy[zoneIndex] = { ...zonesCopy[zoneIndex], ...updates };
      secCopy.zones = zonesCopy;
      copy[sectionIndex] = secCopy;
      onUpdateSections(copy);
    };

    const currentPreset = zone.responsiveWidth[activeDeviceTab];
    const customKey = `${activeDeviceTab}Custom` as 'desktopCustom' | 'tabletCustom' | 'mobileCustom';
    const customVal = zone.responsiveWidth[customKey] || 50;

    const handleSetPreset = (preset: ZoneWidthPreset) => {
      const nextResponsive = { ...zone.responsiveWidth, [activeDeviceTab]: preset };
      handleUpdateZone({ responsiveWidth: nextResponsive });
    };

    const handleSetCustomVal = (val: number) => {
      const clamped = Math.min(100, Math.max(10, val));
      const nextResponsive = {
        ...zone.responsiveWidth,
        [activeDeviceTab]: 'custom' as ZoneWidthPreset,
        [customKey]: clamped,
      };
      handleUpdateZone({ responsiveWidth: nextResponsive });
    };

    return (
      <aside className="properties-drawer">
        <div className="properties-drawer__header">
          <div className="properties-drawer__header-title">
            <span className="material-icon">view_column</span>
            <span>Zone #{zoneIndex + 1}</span>
            <Badge variant="warning" size="small">Zone</Badge>
          </div>
          <div className="properties-drawer__header-actions">
            {onClose && (
              <button
                type="button"
                className="properties-drawer__close-btn"
                onClick={onClose}
                title="Close properties"
              >
                <span className="material-icon">close</span>
              </button>
            )}
          </div>
        </div>
        <div className="properties-drawer__body">
          <div className="properties-group">
            <FormField style={{ margin: 0 }}>
              <FormLabel htmlFor="zone-name">Zone Label</FormLabel>
              <Input
                id="zone-name"
                value={zone.name || ''}
                onChange={(e) => handleUpdateZone({ name: e.target.value })}
                placeholder="Zone name..."
                style={{ height: '30px', fontSize: '12px' }}
              />
            </FormField>
          </div>

          <div className="properties-group">
            {/* Responsive Width Controls */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <FormLabel style={{ marginBottom: 0 }}>Width</FormLabel>
                <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '600' }}>
                  {getZoneWidthPercent(currentPreset, customVal)}%
                </span>
              </div>

              {/* Device Switcher */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--color-bg-primary)',
                  padding: '2px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '6px',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDeviceTabClick('desktop')}
                  style={{
                    flex: 1,
                    padding: '3px 2px',
                    border: 'none',
                    background: activeDeviceTab === 'desktop' ? 'var(--color-primary)' : 'transparent',
                    color: activeDeviceTab === 'desktop' ? '#fff' : 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-xs, 2px)',
                    fontSize: '10px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <span className="material-icon" style={{ fontSize: '12px' }}>desktop_windows</span>
                    Desktop
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeviceTabClick('tablet')}
                  style={{
                    flex: 1,
                    padding: '3px 2px',
                    border: 'none',
                    background: activeDeviceTab === 'tablet' ? 'var(--color-primary)' : 'transparent',
                    color: activeDeviceTab === 'tablet' ? '#fff' : 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-xs, 2px)',
                    fontSize: '10px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <span className="material-icon" style={{ fontSize: '12px' }}>tablet_mac</span>
                    Tablet
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeviceTabClick('mobile')}
                  style={{
                    flex: 1,
                    padding: '3px 2px',
                    border: 'none',
                    background: activeDeviceTab === 'mobile' ? 'var(--color-primary)' : 'transparent',
                    color: activeDeviceTab === 'mobile' ? '#fff' : 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-xs, 2px)',
                    fontSize: '10px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <span className="material-icon" style={{ fontSize: '12px' }}>phone_iphone</span>
                    Mobile
                  </span>
                </button>
              </div>

              {/* Visual Width Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {WIDTH_PRESETS.map((preset) => {
                  const isSelected = currentPreset === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handleSetPreset(preset.key)}
                      style={{
                        padding: '4px 2px',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                        color: isSelected ? '#fff' : 'var(--color-text-primary)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: isSelected ? '600' : 'normal',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1px',
                      }}
                    >
                      <span>{preset.label}</span>
                      <span style={{ fontSize: '9px', opacity: 0.8 }}>{preset.percent}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom slider when custom is selected */}
              {currentPreset === 'custom' && (
                <div style={{ marginTop: '6px', padding: '4px 6px', backgroundColor: 'var(--color-bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                    <span>Custom</span>
                    <span>{customVal}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={customVal}
                    onChange={(e) => handleSetCustomVal(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-primary)', height: '4px' }}
                  />
                </div>
              )}
            </div>

            {/* 3x3 Visual Flex Alignment Selector Matrix */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <FormLabel style={{ marginBottom: 0 }}>Alignment (3×3)</FormLabel>
                {zone.alignment && (
                  <span style={{ fontSize: '10px', color: 'var(--color-primary)', textTransform: 'capitalize' }}>
                    {zone.alignment.replace('-', ' ')}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '3px',
                  backgroundColor: 'var(--color-bg-primary)',
                  padding: '4px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {ZONE_ALIGNMENTS.map((align) => {
                  const isSelected = zone.alignment === align.key;
                  return (
                    <button
                      key={align.key}
                      type="button"
                      title={align.label}
                      onClick={() => handleUpdateZone({ alignment: align.key })}
                      style={{
                        padding: '4px 0',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                        color: isSelected ? '#fff' : 'var(--color-text-primary)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-xs, 2px)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1px',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span className="material-icon" style={{ fontSize: '13px' }}>
                        {align.icon}
                      </span>
                      <span style={{ fontSize: '8.5px', fontWeight: isSelected ? '600' : '400', whiteSpace: 'nowrap' }}>
                        {align.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Element Arrangement */}
            <div style={{ marginTop: '8px' }}>
              <FormLabel>Arrangement</FormLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleUpdateZone({ layout: 'column' })}
                  style={{
                    padding: '4px',
                    backgroundColor: zone.layout === 'column' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                    color: zone.layout === 'column' ? '#fff' : 'var(--color-text-primary)',
                    border: `1px solid ${zone.layout === 'column' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500',
                  }}
                >
                  Column
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateZone({ layout: 'row' })}
                  style={{
                    padding: '4px',
                    backgroundColor: zone.layout === 'row' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                    color: zone.layout === 'row' ? '#fff' : 'var(--color-text-primary)',
                    border: `1px solid ${zone.layout === 'row' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500',
                  }}
                >
                  Row
                </button>
              </div>
            </div>

            {/* Zone Min Height */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <FormLabel style={{ marginBottom: 0 }}>Min Height</FormLabel>
                <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '600' }}>
                  {zone.customHeight || 'Auto'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', marginBottom: '4px' }}>
                {['auto', '60px', '100px', '160px'].map((h) => {
                  const isSelected = (zone.customHeight || 'auto') === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleUpdateZone({ customHeight: h === 'auto' ? undefined : h })}
                      style={{
                        padding: '3px 0',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                        color: isSelected ? '#fff' : 'var(--color-text-primary)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-xs, 2px)',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: isSelected ? '600' : 'normal',
                        textAlign: 'center',
                      }}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
              <Input
                value={zone.customHeight || ''}
                onChange={(e) => handleUpdateZone({ customHeight: e.target.value })}
                placeholder="Custom height (e.g. 80px)"
                style={{ height: '26px', fontSize: '11px' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            <Button
              variant="danger"
              size="small"
              onClick={() => onDeleteZone(section.id, zone.id)}
              style={{ width: '100%', height: '28px', fontSize: '12px' }}
            >
              Delete Zone
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  // 4. ELEMENT PROPERTIES
  if (selection.type === 'element') {
    let sectionIndex = sections.findIndex((s) => s.id === selection.sectionId);
    let zoneIndex = sectionIndex !== -1 ? sections[sectionIndex].zones.findIndex((z) => z.id === selection.zoneId) : -1;
    let elementIndex =
      sectionIndex !== -1 && zoneIndex !== -1
        ? sections[sectionIndex].zones[zoneIndex].elements.findIndex((e) => e.id === selection.elementId)
        : -1;

    if (elementIndex === -1) {
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const s = sections[sIdx];
        for (let zIdx = 0; zIdx < s.zones.length; zIdx++) {
          const eIdx = s.zones[zIdx].elements.findIndex((e) => e.id === selection.elementId);
          if (eIdx !== -1) {
            sectionIndex = sIdx;
            zoneIndex = zIdx;
            elementIndex = eIdx;
            break;
          }
        }
        if (elementIndex !== -1) break;
      }
    }

    if (sectionIndex === -1 || zoneIndex === -1 || elementIndex === -1) return null;
    const section = sections[sectionIndex];
    const zone = section.zones[zoneIndex];
    const element = zone.elements[elementIndex];
    if (!element) return null;

    const isData = isDataField(element.type);

    const handleUpdateElement = (updates: Partial<FormElement>) => {
      const copy = [...sections];
      const secCopy = { ...copy[sectionIndex] };
      const zonesCopy = [...secCopy.zones];
      const elementsCopy = [...zonesCopy[zoneIndex].elements];

      elementsCopy[elementIndex] = { ...elementsCopy[elementIndex], ...updates };
      zonesCopy[zoneIndex] = { ...zonesCopy[zoneIndex], elements: elementsCopy };
      secCopy.zones = zonesCopy;
      copy[sectionIndex] = secCopy;
      onUpdateSections(copy);
    };

    // Human-friendly label change: keep internal platform reference key automatically updated in the background
    const handleLabelChange = (newLabel: string) => {
      const updates: Partial<FormElement> = {
        label: newLabel,
        name: newLabel,
      };
      if (!element.isReferenceManual || !element.reference) {
        updates.reference = generateReference(newLabel);
      }
      handleUpdateElement(updates);
    };

    return (
      <aside className="properties-drawer">
        <div className="properties-drawer__header">
          <div className="properties-drawer__header-title">
            <span className="material-icon">tune</span>
            <span>{element.label || element.name || 'Element'}</span>
            <Badge variant="success" size="small">{element.type.toUpperCase()}</Badge>
          </div>
          <div className="properties-drawer__header-actions">
            {onClose && (
              <button
                type="button"
                className="properties-drawer__close-btn"
                onClick={onClose}
                title="Close properties"
              >
                <span className="material-icon">close</span>
              </button>
            )}
          </div>
        </div>
        <div className="properties-drawer__body">
          {/* 1. IDENTITY */}
          <div className="properties-group">
            {/* Interactive Data Elements */}
            {isData && (
              <>
                <FormField style={{ margin: 0 }}>
                  <FormLabel htmlFor="field-label">Label</FormLabel>
                  <Input
                    id="field-label"
                    value={element.label ?? element.name ?? ''}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    placeholder="Field label..."
                    style={{ height: '30px', fontSize: '12px' }}
                  />
                </FormField>

                <FormField style={{ margin: 0 }}>
                  <FormLabel htmlFor="field-description">Description</FormLabel>
                  <Input
                    id="field-description"
                    value={element.helperText || ''}
                    onChange={(e) => handleUpdateElement({ helperText: e.target.value })}
                    placeholder="Helper text..."
                    style={{ height: '30px', fontSize: '12px' }}
                  />
                </FormField>
              </>
            )}

            {/* Button */}
            {element.type === 'button' && (
              <FormField style={{ margin: 0 }}>
                <FormLabel htmlFor="btn-label">Label</FormLabel>
                <Input
                  id="btn-label"
                  value={element.buttonText || element.label || ''}
                  onChange={(e) =>
                    handleUpdateElement({
                      buttonText: e.target.value,
                      label: e.target.value,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Submit Form"
                  style={{ height: '30px', fontSize: '12px' }}
                />
              </FormField>
            )}

            {/* Title / Heading */}
            {element.type === 'title' && (
              <FormField style={{ margin: 0 }}>
                <FormLabel htmlFor="heading-text">Heading Text</FormLabel>
                <Input
                  id="heading-text"
                  value={element.content || element.label || ''}
                  onChange={(e) =>
                    handleUpdateElement({
                      content: e.target.value,
                      label: e.target.value,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter heading..."
                  style={{ height: '30px', fontSize: '12px' }}
                />
              </FormField>
            )}

            {/* Description Paragraph */}
            {element.type === 'description' && (
              <FormField style={{ margin: 0 }}>
                <FormLabel htmlFor="desc-content">Description</FormLabel>
                <Textarea
                  id="desc-content"
                  value={element.content || element.label || ''}
                  onChange={(e) =>
                    handleUpdateElement({
                      content: e.target.value,
                      label: e.target.value,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter description..."
                  rows={2}
                  style={{ fontSize: '12px' }}
                />
              </FormField>
            )}

            {/* Alert Box */}
            {element.type === 'alert' && (
              <FormField style={{ margin: 0 }}>
                <FormLabel htmlFor="alert-content">Notice Text</FormLabel>
                <Textarea
                  id="alert-content"
                  value={element.content || element.label || ''}
                  onChange={(e) =>
                    handleUpdateElement({
                      content: e.target.value,
                      label: e.target.value,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter notice text..."
                  rows={2}
                  style={{ fontSize: '12px' }}
                />
              </FormField>
            )}
          </div>

          {/* 2. CONFIGURATION */}
          <div className="properties-group">
            {/* Placeholder */}
            {['text', 'email', 'number', 'phone', 'textarea', 'date'].includes(element.type) && (
              <FormField style={{ margin: 0 }}>
                <FormLabel htmlFor="field-placeholder">Placeholder</FormLabel>
                <Input
                  id="field-placeholder"
                  value={element.placeholder || ''}
                  onChange={(e) => handleUpdateElement({ placeholder: e.target.value })}
                  placeholder="e.g. Enter value..."
                  style={{ height: '30px', fontSize: '12px' }}
                />
              </FormField>
            )}

            {/* Default Value for text-based fields */}
            {['text', 'email', 'phone', 'textarea', 'date'].includes(element.type) && (
              <FormField style={{ margin: 0 }}>
                <FormLabel htmlFor="field-default-value">Default Value</FormLabel>
                <Input
                  id="field-default-value"
                  value={element.defaultValue ?? ''}
                  onChange={(e) => handleUpdateElement({ defaultValue: e.target.value })}
                  placeholder="Initial default value..."
                  style={{ height: '30px', fontSize: '12px' }}
                />
              </FormField>
            )}

            {/* Default Value for number field */}
            {element.type === 'number' && (
              <FormField style={{ margin: 0 }}>
                <FormLabel htmlFor="field-default-value">Default Value</FormLabel>
                <Input
                  id="field-default-value"
                  type="number"
                  value={element.defaultValue ?? ''}
                  onChange={(e) =>
                    handleUpdateElement({
                      defaultValue: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="e.g. 0"
                  style={{ height: '30px', fontSize: '12px' }}
                />
              </FormField>
            )}

            {/* Heading Level for Title */}
            {element.type === 'title' && (
              <FormField style={{ margin: 0 }}>
                <FormLabel htmlFor="heading-level">Heading Size</FormLabel>
                <Select
                  id="heading-level"
                  value={String(element.headingLevel || 2)}
                  onChange={(e) =>
                    handleUpdateElement({ headingLevel: Number(e.target.value) as 1 | 2 | 3 })
                  }
                  style={{ height: '30px', fontSize: '12px' }}
                >
                  <option value="1">H1 — Large</option>
                  <option value="2">H2 — Medium</option>
                  <option value="3">H3 — Small</option>
                </Select>
              </FormField>
            )}

            {/* Alert Variant */}
            {element.type === 'alert' && (
              <FormField style={{ margin: 0 }}>
                <FormLabel htmlFor="alert-variant">Alert Style</FormLabel>
                <Select
                  id="alert-variant"
                  value={element.alertVariant || 'info'}
                  onChange={(e) =>
                    handleUpdateElement({
                      alertVariant: e.target.value as 'info' | 'warning' | 'success',
                    })
                  }
                  style={{ height: '30px', fontSize: '12px' }}
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Amber)</option>
                  <option value="success">Success (Green)</option>
                </Select>
              </FormField>
            )}

            {/* Options list for Select and Radio */}
            {(element.type === 'select' || element.type === 'radio') && (
              <div>
                <FormLabel>Options</FormLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(element.options || []).map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(element.options || [])];
                          newOpts[idx] = e.target.value;
                          handleUpdateElement({ options: newOpts });
                        }}
                        placeholder={`Option ${idx + 1}`}
                        style={{ flex: 1, height: '28px', fontSize: '12px' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = (element.options || []).filter((_, i) => i !== idx);
                          handleUpdateElement({ options: newOpts });
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-danger)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Remove option"
                      >
                        <span className="material-icon" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="small"
                    style={{ height: '26px', fontSize: '11px' }}
                    onClick={() => {
                      const newOpts = [...(element.options || []), `Option ${(element.options?.length || 0) + 1}`];
                      handleUpdateElement({ options: newOpts });
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span className="material-icon" style={{ fontSize: '14px' }}>add</span>
                      Add Option
                    </span>
                  </Button>
                </div>

                {/* Default Option for Select / Radio */}
                {!element.multiple && (
                  <FormField style={{ margin: '8px 0 0 0' }}>
                    <FormLabel htmlFor="field-default-option">Default Selection</FormLabel>
                    <Select
                      id="field-default-option"
                      value={element.defaultValue || ''}
                      onChange={(e) => handleUpdateElement({ defaultValue: e.target.value || undefined })}
                      style={{ height: '30px', fontSize: '12px' }}
                    >
                      <option value="">-- No Default Selection --</option>
                      {(element.options || []).map((opt, idx) => (
                        <option key={idx} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}
              </div>
            )}

            {/* Checkbox Default Checked */}
            {element.type === 'checkbox' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  backgroundColor: 'var(--color-bg-primary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                  Checked by Default
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(element.defaultValue)}
                  onChange={(e) => handleUpdateElement({ defaultValue: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
              </div>
            )}

            {/* Button Action */}
            {element.type === 'button' && (
              <FormField style={{ margin: 0 }}>
                <FormLabel htmlFor="btn-action">Button Action</FormLabel>
                <Select
                  id="btn-action"
                  value={element.buttonAction || 'submit'}
                  onChange={(e) =>
                    handleUpdateElement({
                      buttonAction: e.target.value as 'submit' | 'reset' | 'button',
                    })
                  }
                  style={{ height: '30px', fontSize: '12px' }}
                >
                  <option value="submit">Submit Form</option>
                  <option value="reset">Reset Form</option>
                  <option value="button">Standard Action</option>
                </Select>
              </FormField>
            )}

            {/* Mandatory / Required field toggle */}
            {isData && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  backgroundColor: 'var(--color-bg-primary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                  Mandatory (Required)
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(element.required)}
                  onChange={(e) => handleUpdateElement({ required: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
              </div>
            )}
          </div>

          {/* 3. DIMENSIONS (Width & Height) */}
          <div className="properties-group">
            {/* Element Width */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <FormLabel style={{ marginBottom: 0 }}>Width (Max 100%)</FormLabel>
                <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '600' }}>
                  {element.customWidth || '100%'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', marginBottom: '4px' }}>
                {['100%', '75%', '50%', '33%', '25%'].map((w) => {
                  const isSelected = (element.customWidth || '100%') === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleUpdateElement({ customWidth: w })}
                      style={{
                        padding: '3px 0',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                        color: isSelected ? '#fff' : 'var(--color-text-primary)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-xs, 2px)',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: isSelected ? '600' : 'normal',
                        textAlign: 'center',
                      }}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
              <Input
                value={element.customWidth || ''}
                onChange={(e) => handleUpdateElement({ customWidth: e.target.value })}
                placeholder="Width (e.g. 100%, 300px)"
                style={{ height: '26px', fontSize: '11px' }}
              />
            </div>

            {/* Element Height */}
            <div style={{ marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <FormLabel style={{ marginBottom: 0 }}>Height</FormLabel>
                <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: '600' }}>
                  {element.customHeight || 'Auto'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', marginBottom: '4px' }}>
                {['auto', '36px', '48px', '80px'].map((h) => {
                  const isSelected = (element.customHeight || 'auto') === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleUpdateElement({ customHeight: h === 'auto' ? undefined : h })}
                      style={{
                        padding: '3px 0',
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                        color: isSelected ? '#fff' : 'var(--color-text-primary)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-xs, 2px)',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: isSelected ? '600' : 'normal',
                        textAlign: 'center',
                      }}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
              <Input
                value={element.customHeight || ''}
                onChange={(e) => handleUpdateElement({ customHeight: e.target.value })}
                placeholder="Height (e.g. 40px, 120px)"
                style={{ height: '26px', fontSize: '11px' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            <Button
              variant="danger"
              size="small"
              onClick={() => onDeleteElement(section.id, zone.id, element.id)}
              style={{ width: '100%', height: '28px', fontSize: '12px' }}
            >
              Delete Element
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  return null;
};

