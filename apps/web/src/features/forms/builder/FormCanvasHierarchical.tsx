import React, { useState } from 'react';
import {
  FormSection,
  LayoutDirection,
  FormElementType,
  getZoneWidthPercent,
  getZoneFlexStyles,
} from '@saas/shared';
import { SelectionType } from './PropertiesPanel';
import { Button, FieldElement } from '../../../components';
import { scopeCss } from './scopeCss';
import './FormCanvasHierarchical.scss';

export interface FormCanvasHierarchicalProps {
  formTitle: string;
  formLayout: LayoutDirection;
  sections: FormSection[];
  onUpdateSections: (sections: FormSection[]) => void;
  selection: SelectionType;
  onSelect: (sel: SelectionType) => void;
  onAddElementType: (type: FormElementType, sectionId?: string, zoneId?: string, targetIndex?: number) => void;
  onAddSection: () => void;
  onAddZone: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onDeleteZone?: (sectionId: string, zoneId: string) => void;
  onDeleteElement?: (sectionId: string, zoneId: string, elementId: string) => void;
  duplicateReferences: string[];
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  customCss?: string;
  formId?: string;
  mobileWidth?: number;
}

type ActiveDragKind = 'section' | 'zone' | 'element' | 'palette_element' | null;

export const FormCanvasHierarchical: React.FC<FormCanvasHierarchicalProps> = ({
  formTitle: _formTitle,
  formLayout,
  sections,
  onUpdateSections,
  selection,
  onSelect,
  onAddElementType,
  onAddSection,
  onAddZone: _onAddZone,
  onDeleteSection,
  onDeleteZone,
  onDeleteElement,
  duplicateReferences: _duplicateReferences,
  previewDevice,
  customCss = '',
  formId,
  mobileWidth = 375,
}) => {
  const scopeClass = formId ? `form-scope-${formId}` : 'form-scope-canvas';
  const scopedStyles = React.useMemo(() => {
    return customCss ? scopeCss(customCss, `.${scopeClass}`) : '';
  }, [customCss, scopeClass]);

  const [activeDragKind, setActiveDragKind] = useState<ActiveDragKind>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);

  // Exact insertion position targets
  const [sectionDropTargetIndex, setSectionDropTargetIndex] = useState<number | null>(null);
  const [zoneDropTarget, setZoneDropTarget] = useState<{ sectionId: string; index: number } | null>(null);
  const [elementDropTarget, setElementDropTarget] = useState<{ zoneId: string; index: number } | null>(null);

  // Currently dragging item identifiers
  const [draggingSectionIndex, setDraggingSectionIndex] = useState<number | null>(null);
  const [draggingZoneInfo, setDraggingZoneInfo] = useState<{ sectionId: string; index: number } | null>(null);
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);

  // Reset all drag states
  const clearDragState = () => {
    setActiveDragKind(null);
    setHoveredZoneId(null);
    setHoveredSectionId(null);
    setSectionDropTargetIndex(null);
    setZoneDropTarget(null);
    setElementDropTarget(null);
    setDraggingSectionIndex(null);
    setDraggingZoneInfo(null);
    setDraggingElementId(null);
  };

  // Section movement
  const handleMoveSection = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= sections.length || fromIdx === toIdx) return;
    const copy = [...sections];
    const [moved] = copy.splice(fromIdx, 1);
    const target = toIdx > fromIdx ? toIdx - 1 : toIdx;
    copy.splice(target, 0, moved);
    onUpdateSections(copy);
  };

  // Move Zone within or between sections
  const handleMoveZoneAcrossSections = (
    fromSecId: string,
    fromZoneIdx: number,
    toSecId: string,
    toZoneIdx: number,
  ) => {
    const copy = [...sections];
    const fromSecIdx = copy.findIndex((s) => s.id === fromSecId);
    const toSecIdx = copy.findIndex((s) => s.id === toSecId);
    if (fromSecIdx === -1 || toSecIdx === -1) return;

    const fromZones = [...copy[fromSecIdx].zones];
    const [movedZone] = fromZones.splice(fromZoneIdx, 1);
    if (!movedZone) return;

    if (fromSecId === toSecId) {
      const clampedIdx = Math.min(toZoneIdx > fromZoneIdx ? toZoneIdx - 1 : toZoneIdx, fromZones.length);
      fromZones.splice(clampedIdx, 0, movedZone);
      copy[fromSecIdx] = { ...copy[fromSecIdx], zones: fromZones };
    } else {
      const toZones = [...copy[toSecIdx].zones];
      const clampedIdx = Math.min(toZoneIdx, toZones.length);
      toZones.splice(clampedIdx, 0, movedZone);

      copy[fromSecIdx] = { ...copy[fromSecIdx], zones: fromZones };
      copy[toSecIdx] = { ...copy[toSecIdx], zones: toZones };
    }

    onUpdateSections(copy);
  };

  // Move Element within or between zones
  const handleMoveElement = (
    fromSecId: string,
    fromZoneId: string,
    fromElIdx: number,
    toSecId: string,
    toZoneId: string,
    toElIdx: number,
  ) => {
    const copy = [...sections];
    const fromSecIdx = copy.findIndex((s) => s.id === fromSecId);
    const toSecIdx = copy.findIndex((s) => s.id === toSecId);
    if (fromSecIdx === -1 || toSecIdx === -1) return;

    const fromZoneIdx = copy[fromSecIdx].zones.findIndex((z) => z.id === fromZoneId);
    const toZoneIdx = copy[toSecIdx].zones.findIndex((z) => z.id === toZoneId);
    if (fromZoneIdx === -1 || toZoneIdx === -1) return;

    const sourceElements = [...copy[fromSecIdx].zones[fromZoneIdx].elements];
    const [movedElement] = sourceElements.splice(fromElIdx, 1);
    if (!movedElement) return;

    // Moving between zones preserves 100% of the element configuration without alteration
    if (fromSecId === toSecId && fromZoneId === toZoneId) {
      const targetIdx = toElIdx > fromElIdx ? toElIdx - 1 : toElIdx;
      const clampedIdx = Math.max(0, Math.min(targetIdx, sourceElements.length));
      sourceElements.splice(clampedIdx, 0, movedElement);
      const zones = [...copy[fromSecIdx].zones];
      zones[fromZoneIdx] = { ...zones[fromZoneIdx], elements: sourceElements };
      copy[fromSecIdx] = { ...copy[fromSecIdx], zones };
    } else {
      const targetElements = [...copy[toSecIdx].zones[toZoneIdx].elements];
      const clampedIdx = Math.max(0, Math.min(toElIdx, targetElements.length));
      targetElements.splice(clampedIdx, 0, movedElement);

      const fromZones = [...copy[fromSecIdx].zones];
      fromZones[fromZoneIdx] = { ...fromZones[fromZoneIdx], elements: sourceElements };
      copy[fromSecIdx] = { ...copy[fromSecIdx], zones: fromZones };

      const toZones = [...copy[toSecIdx].zones];
      toZones[toZoneIdx] = { ...toZones[toZoneIdx], elements: targetElements };
      copy[toSecIdx] = { ...copy[toSecIdx], zones: toZones };
    }

    onUpdateSections(copy);
  };

  // Section Drag Over Handler
  const handleSectionDragOver = (
    e: React.DragEvent,
    sectionIdx: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dragging section
    if (activeDragKind === 'section') {
      const rect = e.currentTarget.getBoundingClientRect();
      const isAfter =
        formLayout === 'row'
          ? e.clientX - rect.left > rect.width / 2
          : e.clientY - rect.top > rect.height / 2;
      setSectionDropTargetIndex(isAfter ? sectionIdx + 1 : sectionIdx);
    }
  };

  // Zone Drag Over Handler
  const handleZoneDragOver = (
    e: React.DragEvent,
    sectionId: string,
    zoneIdx: number,
    sectionLayout: LayoutDirection,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (activeDragKind === 'zone') {
      const rect = e.currentTarget.getBoundingClientRect();
      const isAfter =
        sectionLayout === 'row'
          ? e.clientX - rect.left > rect.width / 2
          : e.clientY - rect.top > rect.height / 2;
      setZoneDropTarget({ sectionId, index: isAfter ? zoneIdx + 1 : zoneIdx });
    }
  };

  // Element Drag Over Handler (on an existing element in a zone)
  const handleElementDragOver = (
    e: React.DragEvent,
    zoneId: string,
    elementIdx: number,
    zoneLayout: LayoutDirection,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (activeDragKind !== 'section' && activeDragKind !== 'zone') {
      const rect = e.currentTarget.getBoundingClientRect();
      const isAfter =
        zoneLayout === 'row'
          ? e.clientX - rect.left > rect.width / 2
          : e.clientY - rect.top > rect.height / 2;
      setElementDropTarget({ zoneId, index: isAfter ? elementIdx + 1 : elementIdx });
      setHoveredZoneId(zoneId);
    }
  };

  // Drop on Section (for reordering sections)
  const handleSectionDrop = (e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();

    const rawData = e.dataTransfer.getData('application/json');
    clearDragState();
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);
      if (data.kind === 'section' && typeof data.sectionIndex === 'number') {
        const dest = targetIndex !== undefined ? targetIndex : sections.length;
        handleMoveSection(data.sectionIndex, dest);
      }
    } catch {
      // ignore
    }
  };

  // Drop on Section's Zones Area (for dropping a zone into this section)
  const handleSectionZoneAreaDrop = (e: React.DragEvent, sectionId: string, targetZoneIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();

    const rawData = e.dataTransfer.getData('application/json');
    clearDragState();
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);
      if (data.kind === 'zone') {
        const { sourceSectionId, zoneIndex } = data;
        const targetSec = sections.find((s) => s.id === sectionId);
        const dest = targetZoneIndex !== undefined ? targetZoneIndex : (targetSec?.zones.length || 0);
        handleMoveZoneAcrossSections(sourceSectionId, zoneIndex, sectionId, dest);
      }
    } catch {
      // ignore
    }
  };

  // Drop on Zone (for dropping an element into this zone)
  const handleZoneDrop = (
    e: React.DragEvent,
    sectionId: string,
    zoneId: string,
    targetElementIndex?: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const rawData = e.dataTransfer.getData('application/json');
    const plainText = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
    clearDragState();

    if (rawData) {
      try {
        const data = JSON.parse(rawData);

        // Dropping a palette element into this zone
        if (
          (data.kind === 'palette_element' ||
            data.action === 'create' ||
            data.source === 'palette' ||
            data.type) &&
          data.type
        ) {
          onAddElementType(data.type, sectionId, zoneId, targetElementIndex);
          return;
        }

        // Reordering or moving an existing element
        if (data.kind === 'element' || data.action === 'reorder_element') {
          const { sourceSectionId, sourceZoneId, elementIndex } = data;
          const zone = sections.find((s) => s.id === sectionId)?.zones.find((z) => z.id === zoneId);
          const dest = targetElementIndex !== undefined ? targetElementIndex : (zone?.elements.length || 0);
          handleMoveElement(sourceSectionId, sourceZoneId, elementIndex, sectionId, zoneId, dest);
          return;
        }
      } catch {
        // fallback to plain text if JSON parse failed
      }
    }

    // Fallback: plain text element type (e.g. 'text', 'email', etc.)
    if (plainText) {
      const trimmed = plainText.trim() as FormElementType;
      if (trimmed) {
        onAddElementType(trimmed, sectionId, zoneId, targetElementIndex);
      }
    }
  };

  // Progressive drill-down selection logic
  const handleSectionClick = (e: React.MouseEvent, sectionId: string) => {
    e.stopPropagation();
    onSelect({ type: 'section', sectionId });
  };

  const handleZoneClick = (e: React.MouseEvent, sectionId: string, zoneId: string) => {
    e.stopPropagation();
    // 1. If form (or nothing) is selected -> Select root parent (Section) first
    if (!selection || selection.type === 'form') {
      onSelect({ type: 'section', sectionId });
      return;
    }
    // 2. If another section is selected -> Select this section first
    if (selection.type === 'section' && selection.sectionId !== sectionId) {
      onSelect({ type: 'section', sectionId });
      return;
    }
    // 3. If THIS section is selected -> Drill down to Zone (Sub)
    if (selection.type === 'section' && selection.sectionId === sectionId) {
      onSelect({ type: 'zone', sectionId, zoneId });
      return;
    }
    // 4. If a zone/element in a different section is selected -> Select this section first
    if (selection.sectionId !== sectionId) {
      onSelect({ type: 'section', sectionId });
      return;
    }
    // 5. If already in this section at zone or element level -> Select this zone
    onSelect({ type: 'zone', sectionId, zoneId });
  };

  const handleElementClick = (
    e: React.MouseEvent,
    sectionId: string,
    zoneId: string,
    elementId: string,
  ) => {
    e.stopPropagation();
    // 1. If form (or nothing) is selected -> Select root parent (Section) first
    if (!selection || selection.type === 'form') {
      onSelect({ type: 'section', sectionId });
      return;
    }
    // 2. If a different section is selected -> Select this section first
    if (selection.type === 'section' && selection.sectionId !== sectionId) {
      onSelect({ type: 'section', sectionId });
      return;
    }
    // 3. If THIS section is selected -> Drill down to Zone (Sub)
    if (selection.type === 'section' && selection.sectionId === sectionId) {
      onSelect({ type: 'zone', sectionId, zoneId });
      return;
    }
    // 4. If a zone/element in a different section is selected -> Select this section first
    if (selection.sectionId !== sectionId) {
      onSelect({ type: 'section', sectionId });
      return;
    }
    // 5. If a different zone in THIS section is selected -> Select that zone
    if (selection.type === 'zone' && selection.zoneId !== zoneId) {
      onSelect({ type: 'zone', sectionId, zoneId });
      return;
    }
    // 6. If THIS zone is selected -> Drill down to Element (Super-sub)
    if (selection.type === 'zone' && selection.zoneId === zoneId) {
      onSelect({ type: 'element', sectionId, zoneId, elementId });
      return;
    }
    // 7. If an element in this zone is selected -> Select this element
    if (selection.type === 'element') {
      if (selection.zoneId !== zoneId) {
        onSelect({ type: 'zone', sectionId, zoneId });
      } else {
        onSelect({ type: 'element', sectionId, zoneId, elementId });
      }
    }
  };

  const isFormSelected = selection?.type === 'form';

  return (
    <div className="form-builder-viewport-container">
      {/* Scoped Custom CSS Injection */}
      {scopedStyles && <style dangerouslySetInnerHTML={{ __html: scopedStyles }} />}

      {/* Device Frame Viewport Simulator */}
      <div
        id="form-canvas-root"
        className={`form-canvas-root ${scopeClass} form-canvas-root--device-${previewDevice} ${
          isFormSelected ? 'form-canvas-root--selected' : ''
        }`}
        style={
          previewDevice === 'mobile'
            ? { width: `${mobileWidth}px`, maxWidth: `${mobileWidth}px`, minWidth: '320px' }
            : undefined
        }
        onPointerDown={(e) => {
          if (e.button === 0 && !(e.target as HTMLElement).closest('.canvas-section-card, .btn')) {
            e.stopPropagation();
            onSelect({ type: 'form' });
          }
        }}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('.canvas-section-card, .btn')) {
            e.stopPropagation();
            onSelect({ type: 'form' });
          }
        }}
        onDragOver={(e) => {
          // Sections drop over container
          if (activeDragKind === 'section') {
            e.preventDefault();
          }
        }}
      >
        {/* Empty Form State */}
        {sections.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-12) var(--space-4)',
              textAlign: 'center',
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ marginBottom: 'var(--space-2)' }}>
              <span className="material-icon" style={{ fontSize: '48px', color: 'var(--color-text-muted)' }}>
                folder_open
              </span>
            </div>
            <h3 style={{ fontSize: 'var(--font-size-base)', margin: '0 0 var(--space-1) 0' }}>
              No Sections in Form
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              Forms are organized into Sections, which contain Zones for your fields.
            </p>
            <Button variant="primary" size="small" onClick={onAddSection}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icon" style={{ fontSize: '16px' }}>add</span>
                Add First Section
              </span>
            </Button>
          </div>
        ) : (
          <div className={`sections-container sections-container--${formLayout}`}>
            {sections.map((section, secIdx) => {
              const isSectionSelected = selection?.type === 'section' && selection.sectionId === section.id;
              const isDraggingThisSection = draggingSectionIndex === secIdx;
              const isSectionDropTargetBefore = activeDragKind === 'section' && sectionDropTargetIndex === secIdx;
              const isSectionDropTargetAfter = activeDragKind === 'section' && sectionDropTargetIndex === secIdx + 1 && secIdx === sections.length - 1;

              return (
                <React.Fragment key={section.id}>
                  {/* Insertion Line Before Section */}
                  {isSectionDropTargetBefore && (
                    <div
                      className={`drop-insertion-indicator ${
                        formLayout === 'row' ? 'drop-insertion-indicator--vertical' : 'drop-insertion-indicator--horizontal'
                      } drop-insertion-indicator--section`}
                    />
                  )}

                  <div
                    id={`canvas-section-${section.id}`}
                    className={`canvas-section-card ${isSectionSelected ? 'canvas-section-card--selected' : ''} ${
                      isDraggingThisSection ? 'canvas-section-card--dragging' : ''
                    } ${hoveredSectionId === section.id && activeDragKind === 'zone' ? 'canvas-section-card--zone-drop-target' : ''}`}
                    style={{
                      width: section.customWidth || undefined,
                      maxWidth: '100%',
                      minHeight: section.customHeight || undefined,
                      boxSizing: 'border-box',
                    }}
                    onClick={(e) => handleSectionClick(e, section.id)}
                    onDragOver={(e) => {
                      handleSectionDragOver(e, secIdx);
                      if (activeDragKind === 'zone') {
                        e.preventDefault();
                        setHoveredSectionId(section.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (hoveredSectionId === section.id) setHoveredSectionId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      clearDragState();

                      const rawData = e.dataTransfer.getData('application/json');
                      if (rawData) {
                        try {
                          const data = JSON.parse(rawData);
                          if (data.kind === 'section') {
                            handleSectionDrop(e, sectionDropTargetIndex ?? secIdx);
                            return;
                          }
                          if (data.kind === 'zone') {
                            handleSectionZoneAreaDrop(e, section.id, zoneDropTarget?.index);
                            return;
                          }
                        } catch {
                          // ignore
                        }
                      }
                      if (activeDragKind === 'section') {
                        handleSectionDrop(e, sectionDropTargetIndex ?? secIdx);
                      } else if (activeDragKind === 'zone') {
                        handleSectionZoneAreaDrop(e, section.id, zoneDropTarget?.index);
                      }
                    }}
                  >
                    {/* Section Header Bar with Title & Delete Action */}
                    <div className="canvas-section-header">
                      <div className="canvas-section-header-left">
                        <span className="canvas-drag-grip" title="Drag to reorder section">
                          <span className="material-icon">drag_indicator</span>
                        </span>
                        <span className="canvas-badge canvas-badge--section">
                          <span className="material-icon">folder_open</span>
                          {section.title ? section.title : `Section ${secIdx + 1}`}
                        </span>
                        <span className="canvas-meta-pill">
                          {section.layout === 'row' ? 'Row Layout' : 'Column Layout'}
                        </span>
                      </div>
                      <div className="canvas-section-header-right">
                        {onDeleteSection && (
                          <button
                            type="button"
                            className="canvas-action-delete canvas-action-delete--section"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSection(section.id);
                            }}
                            title="Delete Section"
                            aria-label="Delete Section"
                            id={`btn-delete-section-${section.id}`}
                          >
                            <span className="material-icon">delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Zones Container inside Section */}
                    {section.zones.length === 0 ? (
                      <div
                        style={{
                          padding: 'var(--space-4) var(--space-3)',
                          textAlign: 'center',
                          border: '1px dashed var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-muted)',
                          fontSize: 'var(--font-size-xs)',
                        }}
                        onDragOver={(e) => {
                          if (activeDragKind === 'zone') {
                            e.preventDefault();
                            setZoneDropTarget({ sectionId: section.id, index: 0 });
                          }
                        }}
                        onDrop={(e) => handleSectionZoneAreaDrop(e, section.id, 0)}
                      >
                        Empty section
                      </div>
                    ) : (
                      <div className={`zones-container zones-container--${section.layout}`}>
                        {section.zones.map((zone, zoneIdx) => {
                          const isZoneSelected = selection?.type === 'zone' && selection.zoneId === zone.id;
                          const isDraggingThisZone =
                            draggingZoneInfo?.sectionId === section.id && draggingZoneInfo.index === zoneIdx;
                          const isHoveredZoneForElement =
                            hoveredZoneId === zone.id && (activeDragKind === 'element' || activeDragKind === 'palette_element');
                          const isZoneDropTargetBefore =
                            activeDragKind === 'zone' &&
                            zoneDropTarget?.sectionId === section.id &&
                            zoneDropTarget?.index === zoneIdx;
                          const isZoneDropTargetAfter =
                            activeDragKind === 'zone' &&
                            zoneDropTarget?.sectionId === section.id &&
                            zoneDropTarget?.index === zoneIdx + 1 &&
                            zoneIdx === section.zones.length - 1;

                          // Responsive width for current device preview
                          const preset = zone.responsiveWidth[previewDevice] || 'full';
                          const customVal =
                            previewDevice === 'desktop'
                              ? zone.responsiveWidth.desktopCustom
                              : previewDevice === 'tablet'
                              ? zone.responsiveWidth.tabletCustom
                              : zone.responsiveWidth.mobileCustom;

                          const widthPercent = getZoneWidthPercent(preset, customVal);

                          // In row layout, subtract proportional share of flex gap (var(--space-3)) so fractional columns stay perfectly in one row
                          const gapRatio = (1 - widthPercent / 100).toFixed(4);
                          const calcWidth =
                            widthPercent >= 100
                              ? '100%'
                              : `calc(${widthPercent}% - (var(--space-3) * ${gapRatio}))`;

                          const zoneFlexStyles = getZoneFlexStyles(
                            zone.layout,
                            zone.alignment,
                            zone.horizontalAlign,
                            zone.verticalAlign,
                          );

                          const zoneWidthStyle: React.CSSProperties =
                            section.layout === 'row'
                              ? {
                                  flex: `0 0 ${calcWidth}`,
                                  maxWidth: calcWidth,
                                  width: calcWidth,
                                  minWidth: 0,
                                  minHeight: zone.customHeight || undefined,
                                  boxSizing: 'border-box',
                                  ...zoneFlexStyles,
                                }
                              : {
                                  width: '100%',
                                  minWidth: 0,
                                  minHeight: zone.customHeight || undefined,
                                  boxSizing: 'border-box',
                                  ...zoneFlexStyles,
                                };

                          const zoneLabel = `Zone ${zoneIdx + 1} (${preset === 'custom' ? `${customVal}%` : preset})`;

                          return (
                            <React.Fragment key={zone.id}>
                              {/* Zone Insertion Indicator Before */}
                              {isZoneDropTargetBefore && (
                                <div
                                  className={`drop-insertion-indicator ${
                                    section.layout === 'row'
                                      ? 'drop-insertion-indicator--vertical'
                                      : 'drop-insertion-indicator--horizontal'
                                  } drop-insertion-indicator--zone`}
                                />
                              )}

                              <div
                                id={`canvas-zone-${zone.id}`}
                                className={`canvas-zone-card ${isZoneSelected ? 'canvas-zone-card--selected' : ''} ${
                                  isDraggingThisZone ? 'canvas-zone-card--dragging' : ''
                                } ${isHoveredZoneForElement ? 'canvas-zone-card--dragover' : ''}`}
                                style={zoneWidthStyle}
                                onClick={(e) => handleZoneClick(e, section.id, zone.id)}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  handleZoneDragOver(e, section.id, zoneIdx, section.layout);
                                  if (activeDragKind !== 'section' && activeDragKind !== 'zone') {
                                    setHoveredZoneId(zone.id);
                                    if (zone.elements.length === 0) {
                                      setElementDropTarget({ zoneId: zone.id, index: 0 });
                                    }
                                  }
                                }}
                                onDragLeave={() => {
                                  if (hoveredZoneId === zone.id) setHoveredZoneId(null);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const dropIdx =
                                    elementDropTarget?.zoneId === zone.id
                                      ? elementDropTarget.index
                                      : zone.elements.length;
                                  handleZoneDrop(e, section.id, zone.id, dropIdx);
                                }}
                              >
                                {/* Zone Header Bar with Tag & Delete Action */}
                                <div className="canvas-zone-header">
                                  <div className="canvas-zone-header-left">
                                    <span className="canvas-drag-grip" title="Drag to reorder zone">
                                      <span className="material-icon">drag_indicator</span>
                                    </span>
                                    <span className="canvas-badge canvas-badge--zone">
                                      <span className="material-icon">view_column</span>
                                      {zoneLabel}
                                    </span>
                                  </div>
                                  <div className="canvas-zone-header-right">
                                    {onDeleteZone && (
                                      <button
                                        type="button"
                                        className="canvas-action-delete canvas-action-delete--zone"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteZone(section.id, zone.id);
                                        }}
                                        title="Delete Zone"
                                        aria-label="Delete Zone"
                                        id={`btn-delete-zone-${zone.id}`}
                                      >
                                        <span className="material-icon">delete</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Elements List inside Zone */}
                                {zone.elements.length === 0 ? (
                                  <div
                                    style={{
                                      padding: 'var(--space-4) var(--space-2)',
                                      textAlign: 'center',
                                      border: '1px dashed var(--color-border)',
                                      borderRadius: 'var(--radius-sm)',
                                      color: 'var(--color-text-muted)',
                                      fontSize: 'var(--font-size-xs)',
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setHoveredZoneId(zone.id);
                                      setElementDropTarget({ zoneId: zone.id, index: 0 });
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleZoneDrop(e, section.id, zone.id, 0);
                                    }}
                                  >
                                    Empty zone
                                  </div>
                                ) : (
                                  <div
                                    className={`elements-container elements-container--${zone.layout}`}
                                    style={zoneFlexStyles}
                                  >
                                    {zone.elements.map((element, elIdx) => {
                                      const isElementSelected =
                                        selection?.type === 'element' && selection.elementId === element.id;
                                      const isDuplicate = false;
                                      const isDraggingThisElement = draggingElementId === element.id;
                                      const isElementDropTargetBefore =
                                        elementDropTarget?.zoneId === zone.id && elementDropTarget.index === elIdx;
                                      const isElementDropTargetAfter =
                                        elementDropTarget?.zoneId === zone.id &&
                                        elementDropTarget.index === elIdx + 1 &&
                                        elIdx === zone.elements.length - 1;

                                      return (
                                        <React.Fragment key={element.id}>
                                          {/* Element Insertion Indicator Before */}
                                          {isElementDropTargetBefore && (
                                            <div
                                              className={`drop-insertion-indicator ${
                                                zone.layout === 'row'
                                                  ? 'drop-insertion-indicator--vertical'
                                                  : 'drop-insertion-indicator--horizontal'
                                              }`}
                                            />
                                          )}

                                          <div
                                            id={`canvas-element-${element.id}`}
                                            className={`canvas-element-item ${
                                              isElementSelected ? 'canvas-element-item--selected' : ''
                                            } ${isDuplicate ? 'canvas-element-item--error' : ''} ${
                                              isDraggingThisElement ? 'canvas-element-item--dragging' : ''
                                            }`}
                                            style={{
                                              width: element.customWidth || '100%',
                                              maxWidth: '100%',
                                              minHeight: element.customHeight || undefined,
                                              boxSizing: 'border-box',
                                            }}
                                            draggable={true}
                                            onDragStart={(e) => {
                                              e.stopPropagation();
                                              setActiveDragKind('element');
                                              setDraggingElementId(element.id);
                                              e.dataTransfer.setData(
                                                'application/json',
                                                JSON.stringify({
                                                  kind: 'element',
                                                  action: 'reorder_element',
                                                  sourceSectionId: section.id,
                                                  sourceZoneId: zone.id,
                                                  elementIndex: elIdx,
                                                  elementId: element.id,
                                                }),
                                              );
                                              e.dataTransfer.effectAllowed = 'move';
                                            }}
                                            onDragEnd={clearDragState}
                                            onDragOver={(e) => handleElementDragOver(e, zone.id, elIdx, zone.layout)}
                                            onDrop={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const dropIdx =
                                                elementDropTarget?.zoneId === zone.id
                                                  ? elementDropTarget.index
                                                  : elIdx + 1;
                                              handleZoneDrop(e, section.id, zone.id, dropIdx);
                                            }}
                                            onClick={(e) => handleElementClick(e, section.id, zone.id, element.id)}
                                          >
                                            {/* Element Top Bar with Drag Grip & Actions */}
                                            <div className="canvas-element-header">
                                              <div className="canvas-element-header-left">
                                                <span className="canvas-element-drag-handle" title="Drag to reorder field">
                                                  <span className="material-icon">drag_indicator</span>
                                                </span>
                                                <span className="canvas-element-type-tag">
                                                  {element.type.toUpperCase()}
                                                </span>
                                              </div>
                                              <div className="canvas-element-header-right">
                                                {onDeleteElement && (
                                                  <button
                                                    type="button"
                                                    className="canvas-action-delete canvas-action-delete--element"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      onDeleteElement(section.id, zone.id, element.id);
                                                    }}
                                                    title="Delete Field"
                                                    aria-label="Delete Field"
                                                    id={`btn-delete-element-${element.id}`}
                                                  >
                                                    <span className="material-icon">delete</span>
                                                  </button>
                                                )}
                                              </div>
                                            </div>

                                            {/* Live Rendered Control with Input Interaction Disabled */}
                                            <div className="canvas-element-content" style={{ pointerEvents: 'none', userSelect: 'none', width: '100%' }}>
                                              <FieldElement element={element} />
                                            </div>
                                          </div>

                                          {/* Element Insertion Indicator After Last Item */}
                                          {isElementDropTargetAfter && (
                                            <div
                                              className={`drop-insertion-indicator ${
                                                zone.layout === 'row'
                                                  ? 'drop-insertion-indicator--vertical'
                                                  : 'drop-insertion-indicator--horizontal'
                                              }`}
                                            />
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Zone Insertion Indicator After Last Zone */}
                              {isZoneDropTargetAfter && (
                                <div
                                  className={`drop-insertion-indicator ${
                                    section.layout === 'row'
                                      ? 'drop-insertion-indicator--vertical'
                                      : 'drop-insertion-indicator--horizontal'
                                  } drop-insertion-indicator--zone`}
                                />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section Insertion Indicator After Last Section */}
                  {isSectionDropTargetAfter && (
                    <div
                      className={`drop-insertion-indicator ${
                        formLayout === 'row' ? 'drop-insertion-indicator--vertical' : 'drop-insertion-indicator--horizontal'
                      } drop-insertion-indicator--section`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
