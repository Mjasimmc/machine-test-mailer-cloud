import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FormDto,
  FormSection,
  FormZone,
  FormElement,
  FormElementType,
  LayoutDirection,
  checkDuplicateReferences,
  extractAllElements,
  generateReference,
  getDataTypeForElementType,
  isDataField,
  getRealisticDefaultForm,
} from '@saas/shared';
import { formsService } from '../../services/forms.service';
import { Spinner } from '../../components';
import { FormCanvasHierarchical } from './builder/FormCanvasHierarchical';
import { PropertiesPanel, SelectionType } from './builder/PropertiesPanel';
import { FloatingElementsPanel } from './builder/FloatingElementsPanel';
import { FloatingStylePanel } from './builder/FloatingStylePanel';
import { FloatingSettingsPanel } from './builder/FloatingSettingsPanel';
import { useFormBuilderHistory } from './builder/useFormBuilderHistory';
import './FormEditorPage.scss';

export const FormEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Core Form & Version State
  const [form, setForm] = useState<FormDto | null>(null);
  const [titleInput, setTitleInput] = useState<string>('');
  const [formLayout, setFormLayout] = useState<LayoutDirection>('column');
  const [sections, setSections] = useState<FormSection[]>([]);
  const [customCss, setCustomCss] = useState<string>('');

  // Contextual Selection: CLOSED BY DEFAULT (null)
  const [selection, setSelection] = useState<SelectionType>(null);

  // Floating Movable Panels: CLOSED BY DEFAULT (null)
  const [activeFloatingPanel, setActiveFloatingPanel] = useState<
    'elements' | 'style' | 'settings' | null
  >(null);

  // Responsive Viewport Simulation
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [mobileWidth, setMobileWidth] = useState<number>(375); // allows testing down to 320px

  // Loading & Network States
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [deployingVersionId, setDeployingVersionId] = useState<string | null>(null);

  // Feedback notifications
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // 1024px Viewport Advisory
  const [isNarrowViewport, setIsNarrowViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );

  // Undo/Redo history
  const { canUndo, canRedo, pushState, undo, redo, resetHistory } = useFormBuilderHistory({
    formLayout: 'column',
    sections: [],
    title: '',
  });

  // Track window resizing for 1024px minimum requirement
  useEffect(() => {
    const handleResize = () => {
      setIsNarrowViewport(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ensure internal platform reference keys are always unique across elements in background
  const deduplicateReferences = (secs: FormSection[]): FormSection[] => {
    const seen = new Set<string>();
    let modified = false;
    const result = secs.map((sec) => ({
      ...sec,
      zones: sec.zones.map((zone) => ({
        ...zone,
        elements: zone.elements.map((el) => {
          if (!isDataField(el.type)) return el;
          const baseRef = (el.reference || generateReference(el.label || el.name || 'field')).trim() || 'field';
          let uniqueRef = baseRef;
          let counter = 1;
          while (seen.has(uniqueRef)) {
            counter++;
            uniqueRef = `${baseRef}_${counter}`;
          }
          seen.add(uniqueRef);
          if (uniqueRef !== el.reference) {
            modified = true;
            return { ...el, reference: uniqueRef };
          }
          return el;
        }),
      })),
    }));
    return modified ? result : secs;
  };

  // Sync state and push to history
  const updateSectionsAndHistory = useCallback(
    (newSections: FormSection[]) => {
      const sanitized = deduplicateReferences(newSections);
      setSections(sanitized);
      pushState({
        formLayout,
        sections: sanitized,
        title: titleInput,
      });
    },
    [formLayout, titleInput, pushState],
  );

  const updateFormLayoutAndHistory = useCallback(
    (newLayout: LayoutDirection) => {
      setFormLayout(newLayout);
      pushState({
        formLayout: newLayout,
        sections,
        title: titleInput,
      });
    },
    [sections, titleInput, pushState],
  );

  // Undo / Redo triggers
  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev) {
      setFormLayout(prev.formLayout);
      setSections(prev.sections);
      setTitleInput(prev.title);
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next) {
      setFormLayout(next.formLayout);
      setSections(next.sections);
      setTitleInput(next.title);
    }
  }, [redo]);

  // Keyboard shortcut listeners (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept undo/redo inside textareas or inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Real-time duplicate references calculation
  const duplicateReferences = checkDuplicateReferences(sections);

  // Load form details and draft
  const loadForm = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await formsService.getOne(id);
      setForm(data);

      const draft = data.draft || (data.versions && data.versions[data.versions.length - 1]);
      if (draft) {
        applyDraftToEditor(draft);
      } else {
        const seed = getRealisticDefaultForm(data.name);
        applyDraftToEditor({
          title: data.name,
          elements: seed.elements,
          sections: seed.sections,
          formLayout: seed.formLayout,
          customCss: '',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const applyDraftToEditor = (draft: {
    title?: string;
    customCss?: string;
    formLayout?: LayoutDirection;
    sections?: FormSection[];
    elements?: FormElement[];
  }) => {
    setTitleInput(draft.title || form?.name || '');
    setCustomCss(draft.customCss || '');
    const layout = draft.formLayout || 'column';
    setFormLayout(layout);

    let initialSections = draft.sections || [];

    // Fallback if legacy without sections
    if (initialSections.length === 0) {
      if (draft.elements && draft.elements.length > 0) {
        initialSections = [
          {
            id: `sec_${Date.now().toString(36)}`,
            name: 'Main Section',
            title: draft.title || '',
            layout: 'column',
            zones: [
              {
                id: `zone_${Date.now().toString(36)}`,
                name: 'Main Zone',
                layout: 'column',
                responsiveWidth: { desktop: 'full', tablet: 'full', mobile: 'full' },
                elements: draft.elements,
              },
            ],
          },
        ];
      } else {
        const seed = getRealisticDefaultForm(draft.title || form?.name || 'Form');
        initialSections = seed.sections;
      }
    }

    setSections(initialSections);
    resetHistory({
      formLayout: layout,
      sections: initialSections,
      title: draft.title || form?.name || '',
    });
    setSelection(null);
  };

  useEffect(() => {
    loadForm();
  }, [id]);

  // Add Section
  const handleAddSection = () => {
    const secId = `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const zoneId = `zone_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const newSection: FormSection = {
      id: secId,
      name: `Section ${sections.length + 1}`,
      title: `Section ${sections.length + 1}`,
      layout: 'row',
      zones: [
        {
          id: zoneId,
          name: 'Zone 1',
          layout: 'column',
          responsiveWidth: {
            desktop: 'full',
            tablet: 'full',
            mobile: 'full',
          },
          elements: [],
        },
      ],
    };

    const nextSections = [...sections, newSection];
    updateSectionsAndHistory(nextSections);
    setSelection({ type: 'section', sectionId: secId });
  };

  // Add Zone to specific section
  const handleAddZone = (sectionId: string) => {
    const secIdx = sections.findIndex((s) => s.id === sectionId);
    if (secIdx === -1) return;
    const sec = sections[secIdx];

    const zoneId = `zone_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newZone: FormZone = {
      id: zoneId,
      name: `Zone ${sec.zones.length + 1}`,
      layout: 'column',
      responsiveWidth: {
        desktop: sec.zones.length > 0 ? 'half' : 'full',
        tablet: 'full',
        mobile: 'full',
      },
      elements: [],
    };

    let updatedZones = [...sec.zones];
    if (sec.layout === 'row' && updatedZones.length === 1 && updatedZones[0].responsiveWidth.desktop === 'full') {
      updatedZones[0] = {
        ...updatedZones[0],
        responsiveWidth: {
          ...updatedZones[0].responsiveWidth,
          desktop: 'half',
        },
      };
    }
    updatedZones.push(newZone);

    const copy = [...sections];
    copy[secIdx] = {
      ...sec,
      zones: updatedZones,
    };
    updateSectionsAndHistory(copy);
    setSelection({ type: 'zone', sectionId, zoneId });
  };

  // Delete Section
  const handleDeleteSection = (sectionId: string) => {
    const updated = sections.filter((s) => s.id !== sectionId);
    updateSectionsAndHistory(updated);
    if (selection && 'sectionId' in selection && selection.sectionId === sectionId) {
      setSelection(null);
    }
  };

  // Delete Zone
  const handleDeleteZone = (sectionId: string, zoneId: string) => {
    const secIdx = sections.findIndex((s) => s.id === sectionId);
    if (secIdx === -1) return;
    const sec = sections[secIdx];
    const filteredZones = sec.zones.filter((z) => z.id !== zoneId);

    const copy = [...sections];
    copy[secIdx] = { ...sec, zones: filteredZones };
    updateSectionsAndHistory(copy);
    if (selection && 'zoneId' in selection && selection.zoneId === zoneId) {
      setSelection(null);
    }
  };

  // Delete Element
  const handleDeleteElement = (sectionId: string, zoneId: string, elementId: string) => {
    const secIdx = sections.findIndex((s) => s.id === sectionId);
    if (secIdx === -1) return;
    const sec = sections[secIdx];
    const zoneIdx = sec.zones.findIndex((z) => z.id === zoneId);
    if (zoneIdx === -1) return;
    const zone = sec.zones[zoneIdx];

    const filteredElements = zone.elements.filter((e) => e.id !== elementId);
    const zonesCopy = [...sec.zones];
    zonesCopy[zoneIdx] = { ...zone, elements: filteredElements };

    const copy = [...sections];
    copy[secIdx] = { ...sec, zones: zonesCopy };
    updateSectionsAndHistory(copy);
    if (selection && selection.type === 'element' && selection.elementId === elementId) {
      setSelection(null);
    }
  };

  // Add Element of type
  const handleAddElementType = (
    type: FormElementType,
    targetSectionId?: string,
    targetZoneId?: string,
    targetIndex?: number,
  ) => {
    let targetSecId = targetSectionId;
    let targetZId = targetZoneId;

    if (!targetSecId || !targetZId) {
      if (selection?.type === 'zone') {
        targetSecId = selection.sectionId;
        targetZId = selection.zoneId;
      } else if (selection?.type === 'element') {
        targetSecId = selection.sectionId;
        targetZId = selection.zoneId;
      } else if (sections.length > 0 && sections[0].zones.length > 0) {
        targetSecId = sections[0].id;
        targetZId = sections[0].zones[0].id;
      }
    }

    let currentSections = [...sections];
    if (!targetSecId || !targetZId || currentSections.length === 0) {
      const secId = `sec_${Date.now().toString(36)}`;
      const zoneId = `zone_${Date.now().toString(36)}`;
      const autoSection: FormSection = {
        id: secId,
        name: 'Main Section',
        layout: 'row',
        zones: [
          {
            id: zoneId,
            name: 'Main Zone',
            layout: 'column',
            responsiveWidth: { desktop: 'full', tablet: 'full', mobile: 'full' },
            elements: [],
          },
        ],
      };
      currentSections = [autoSection];
      targetSecId = secId;
      targetZId = zoneId;
    }

    const secIdx = currentSections.findIndex((s) => s.id === targetSecId);
    if (secIdx === -1) return;
    const sec = currentSections[secIdx];
    const zoneIdx = sec.zones.findIndex((z) => z.id === targetZId);
    if (zoneIdx === -1) return;
    const zone = sec.zones[zoneIdx];

    const fieldId = `fld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const isData = isDataField(type);
    const dataType = getDataTypeForElementType(type);

    let defaultName = 'Text Field';
    let defaultLabel = 'Text Field';
    let defaultPlaceholder: string | undefined = 'Enter text...';
    let defaultOptions: string[] | undefined = undefined;
    let defaultValidation = undefined;

    switch (type) {
      case 'email':
        defaultName = 'Email Address';
        defaultLabel = 'Email Address';
        defaultPlaceholder = 'name@example.com';
        defaultValidation = {
          enabled: true,
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
          errorMessage: 'Please enter a valid email address',
          successMessage: 'Email address is valid',
        };
        break;
      case 'number':
        defaultName = 'Number';
        defaultLabel = 'Number';
        defaultPlaceholder = '0';
        break;
      case 'phone':
        defaultName = 'Phone Number';
        defaultLabel = 'Phone Number';
        defaultPlaceholder = '+1 (555) 000-0000';
        break;
      case 'date':
        defaultName = 'Date';
        defaultLabel = 'Date';
        defaultPlaceholder = '';
        break;
      case 'textarea':
        defaultName = 'Message or Notes';
        defaultLabel = 'Message or Notes';
        defaultPlaceholder = 'Type your message here...';
        break;
      case 'select':
        defaultName = 'Selection';
        defaultLabel = 'Select Option';
        defaultPlaceholder = 'Choose an option';
        defaultOptions = ['Option 1', 'Option 2', 'Option 3'];
        break;
      case 'radio':
        defaultName = 'Radio Selection';
        defaultLabel = 'Choose One';
        defaultOptions = ['Option 1', 'Option 2'];
        break;
      case 'checkbox':
        defaultName = 'Checkbox';
        defaultLabel = 'Confirm or acknowledge selection';
        defaultPlaceholder = undefined;
        break;
      case 'file':
        defaultName = 'File Upload';
        defaultLabel = 'Upload File';
        break;
      case 'button':
        defaultName = 'Submit Button';
        defaultLabel = 'Submit Form';
        break;
      case 'title':
        defaultName = 'Heading';
        defaultLabel = 'Section Heading';
        break;
      case 'description':
        defaultName = 'Description';
        defaultLabel = 'Instructive note or guidance paragraph.';
        break;
      case 'alert':
        defaultName = 'Notice';
        defaultLabel = 'Important information notice.';
        break;
    }

    const autoRef = isData ? generateReference(defaultName) : undefined;

    const newElement: FormElement = {
      id: fieldId,
      type,
      name: defaultName,
      reference: autoRef,
      isReferenceManual: false,
      dataType,
      label: defaultLabel,
      placeholder: defaultPlaceholder,
      required: false,
      options: defaultOptions,
      buttonAction: type === 'button' ? 'submit' : undefined,
      buttonText: type === 'button' ? defaultLabel : undefined,
      headingLevel: type === 'title' ? 2 : undefined,
      content:
        type === 'title' || type === 'description' || type === 'alert'
          ? defaultLabel
          : undefined,
      validation: defaultValidation,
      customWidth: '100%',
    };

    const elementsCopy = [...zone.elements];
    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= elementsCopy.length) {
      elementsCopy.splice(targetIndex, 0, newElement);
    } else {
      elementsCopy.push(newElement);
    }

    const zonesCopy = [...sec.zones];
    zonesCopy[zoneIdx] = { ...zone, elements: elementsCopy };
    currentSections[secIdx] = { ...sec, zones: zonesCopy };

    updateSectionsAndHistory(currentSections);
    setSelection({
      type: 'element',
      sectionId: targetSecId,
      zoneId: targetZId,
      elementId: fieldId,
    });
  };

  // Save Draft (updates the single current draft)
  const handleSaveDraft = async () => {
    if (!id || !titleInput.trim()) return;

    setSavingDraft(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const flattenedElements = extractAllElements(sections);
      const updated = await formsService.updateDraft(id, {
        title: titleInput.trim(),
        sections,
        formLayout,
        elements: flattenedElements,
        customCss,
      });

      setForm(updated);
      setSaveSuccess('Draft saved');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  // Deploy (takes current draft, creates next immutable version snapshot, makes it live)
  const handleDeployVersion = async () => {
    if (!id) return;

    if (duplicateReferences.length > 0) {
      setError('Cannot deploy: please ensure all form fields have distinct names.');
      return;
    }

    setDeployingVersionId('deploying');
    setError(null);

    try {
      // First save current draft changes
      const flattenedElements = extractAllElements(sections);
      await formsService.updateDraft(id, {
        title: titleInput.trim(),
        sections,
        formLayout,
        elements: flattenedElements,
        customCss,
      });

      const updatedForm = await formsService.deploy(id);
      setForm(updatedForm);

      const deployedV = updatedForm.deployedVersion;
      setSaveSuccess(`Version ${deployedV?.versionNumber || ''} is now live and published!`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to deploy version');
    } finally {
      setDeployingVersionId(null);
    }
  };

  // Open full-screen preview in dedicated new URL
  const handleOpenPreview = async () => {
    if (!id) return;
    // Auto-save draft changes first so preview loads latest updates
    if (titleInput.trim()) {
      try {
        const flattenedElements = extractAllElements(sections);
        await formsService.updateDraft(id, {
          title: titleInput.trim(),
          sections,
          formLayout,
          elements: flattenedElements,
          customCss,
        });
      } catch {
        // proceed
      }
    }
    window.open(`/forms/${id}/preview`, '_blank');
  };

  // Bottom toolbar toggle helper
  const handleToggleFloatingPanel = (panel: 'elements' | 'style' | 'settings') => {
    setActiveFloatingPanel((prev) => (prev === panel ? null : panel));
  };

  if (loading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg-primary)',
        }}
      >
        <Spinner size="large" />
      </div>
    );
  }

  if (!form) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          backgroundColor: 'var(--color-bg-primary)',
        }}
      >
        <div style={{ color: '#f87171', fontSize: '16px' }}>Form not found</div>
        <button
          type="button"
          onClick={() => navigate('/forms')}
          style={{
            padding: '8px 16px',
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-icon" style={{ fontSize: '18px' }}>arrow_back</span>
            Return to Forms
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="form-builder-app">
      {/* 1. Sticky Minimal Header */}
      <header className="form-builder-app__header">
        {/* Left: Exit button, Form Name, Status */}
        <div className="form-builder-app__header-left">
          <button
            type="button"
            className="form-builder-app__back-btn"
            onClick={() => navigate(id ? `/forms/${id}` : '/forms')}
            title="Back to Form Details"
            id="back-to-form-details-btn"
          >
            <span className="material-icon">arrow_back</span>
          </button>

          <input
            id="form-title-input"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleSaveDraft}
            placeholder="Form Title..."
            className="form-builder-app__title-input"
            title="Click to rename form"
          />

          {savingDraft ? (
            <div className="form-builder-app__status-pill form-builder-app__status-pill--saving">
              <span className="dot" />
              <span>Saving draft...</span>
            </div>
          ) : form?.deployedVersion ? (
            form.hasUnpublishedChanges ? (
              <div
                className="form-builder-app__status-pill form-builder-app__status-pill--draft"
                title={`Unpublished changes in draft. Live form is on Version ${form.deployedVersion.versionNumber}`}
              >
                <span className="dot" />
                <span>Draft (Unpublished Changes)</span>
              </div>
            ) : (
              <div
                className="form-builder-app__status-pill form-builder-app__status-pill--deployed"
                title={`Live form is up to date with Version ${form.deployedVersion.versionNumber}`}
              >
                <span className="dot" />
                <span>Live v{form.deployedVersion.versionNumber}</span>
              </div>
            )
          ) : (
            <div
              className="form-builder-app__status-pill form-builder-app__status-pill--draft"
              title="Form has not been deployed yet"
            >
              <span className="dot" />
              <span>Draft (Unpublished)</span>
            </div>
          )}
        </div>

        {/* Center: Viewport Switcher & Undo/Redo */}
        <div className="form-builder-app__header-center">
          <div className="form-builder-app__viewport-switcher">
            <button
              type="button"
              className={`form-builder-app__viewport-btn ${
                previewDevice === 'desktop' ? 'active' : ''
              }`}
              onClick={() => setPreviewDevice('desktop')}
              title="Desktop viewport (100%)"
            >
              <span className="material-icon">desktop_windows</span>
              <span>Desktop</span>
            </button>
            <button
              type="button"
              className={`form-builder-app__viewport-btn ${
                previewDevice === 'tablet' ? 'active' : ''
              }`}
              onClick={() => setPreviewDevice('tablet')}
              title="Tablet viewport (768px)"
            >
              <span className="material-icon">tablet_mac</span>
              <span>Tablet</span>
            </button>
            <button
              type="button"
              className={`form-builder-app__viewport-btn ${
                previewDevice === 'mobile' ? 'active' : ''
              }`}
              onClick={() => setPreviewDevice('mobile')}
              title="Mobile viewport (down to 320px)"
            >
              <span className="material-icon">phone_iphone</span>
              <span>Mobile</span>
            </button>
          </div>

          {/* Interactive Mobile Width Slider (320px - 420px) */}
          {previewDevice === 'mobile' && (
            <div className="form-builder-app__mobile-width-control" title="Adjust mobile preview width down to 320px">
              <span>{mobileWidth}px</span>
              <input
                type="range"
                min="320"
                max="420"
                step="5"
                value={mobileWidth}
                onChange={(e) => setMobileWidth(Number(e.target.value))}
              />
            </div>
          )}

          {/* History: Undo / Redo */}
          <div className="form-builder-app__history-group">
            <button
              type="button"
              className="form-builder-app__history-btn"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <span className="material-icon">undo</span>
            </button>
            <button
              type="button"
              className="form-builder-app__history-btn"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              <span className="material-icon">redo</span>
            </button>
          </div>
        </div>

        {/* Right: Preview, Save, Publish/Deploy */}
        <div className="form-builder-app__header-right">
          <button
            type="button"
            className="form-builder-app__action-btn form-builder-app__action-btn--secondary"
            onClick={handleOpenPreview}
            id="btn-live-preview"
            title="Open full-screen preview in new URL"
          >
            <span className="material-icon">open_in_new</span>
            <span>Preview</span>
          </button>

          <button
            type="button"
            className="form-builder-app__action-btn form-builder-app__action-btn--secondary"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            id="btn-save-draft"
          >
            <span className="material-icon">save</span>
            <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            className="form-builder-app__action-btn form-builder-app__action-btn--primary"
            onClick={handleDeployVersion}
            disabled={Boolean(deployingVersionId) || duplicateReferences.length > 0}
            id="btn-deploy-version"
            title={
              duplicateReferences.length > 0
                ? 'Resolve field naming conflicts before deploying'
                : 'Publish and deploy live'
            }
          >
            <span className="material-icon">rocket_launch</span>
            <span>{deployingVersionId ? 'Deploying...' : 'Deploy'}</span>
          </button>
        </div>
      </header>

      {/* Viewport advisory notice (< 1024px) */}
      {isNarrowViewport && (
        <div className="form-builder-app__banner form-builder-app__banner--warning">
          <span className="material-icon">info</span>
          <span>
            Workspace notice: Form Builder is optimized for desktop screens (≥ 1024px). Generated
            forms are fully responsive down to 320px.
          </span>
        </div>
      )}

      {/* Notifications Toast */}
      {saveSuccess && (
        <div className="form-builder-app__banner form-builder-app__banner--success">
          <span className="material-icon">check_circle</span>
          <span>{saveSuccess}</span>
        </div>
      )}
      {error && (
        <div className="form-builder-app__banner form-builder-app__banner--error">
          <span className="material-icon">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* 2. Main Scrolling Canvas Workspace */}
      <main
        className={`form-builder-app__workspace ${
          selection !== null ? 'form-builder-app__workspace--drawer-open' : ''
        }`}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (
            target === e.currentTarget ||
            target.classList.contains('form-builder-app__workspace') ||
            target.classList.contains('form-builder-app__canvas-wrapper') ||
            target.classList.contains('form-builder-viewport-container')
          ) {
            setSelection(null); // Click background closes contextual properties
          }
        }}
      >
        <div
          className={`form-builder-app__canvas-wrapper form-builder-app__canvas-wrapper--${previewDevice}`}
        >
          <FormCanvasHierarchical
            formTitle={titleInput || form.name}
            formLayout={formLayout}
            sections={sections}
            onUpdateSections={updateSectionsAndHistory}
            selection={selection}
            onSelect={setSelection}
            onAddElementType={handleAddElementType}
            onAddSection={handleAddSection}
            onAddZone={handleAddZone}
            onDeleteSection={handleDeleteSection}
            onDeleteZone={handleDeleteZone}
            onDeleteElement={handleDeleteElement}
            duplicateReferences={duplicateReferences}
            previewDevice={previewDevice}
            customCss={customCss}
            formId={form.id}
            mobileWidth={mobileWidth}
          />
        </div>
      </main>

      {/* 3. Sticky Contextual Properties Drawer (Closed by default) */}
      <PropertiesPanel
        selection={selection}
        formLayout={formLayout}
        onUpdateFormLayout={updateFormLayoutAndHistory}
        sections={sections}
        onUpdateSections={updateSectionsAndHistory}
        onAddSection={handleAddSection}
        onAddZone={handleAddZone}
        onDeleteSection={handleDeleteSection}
        onDeleteZone={handleDeleteZone}
        onDeleteElement={handleDeleteElement}
        duplicateReferences={duplicateReferences}
        previewDevice={previewDevice}
        onPreviewDeviceChange={setPreviewDevice}
        onClose={() => setSelection(null)}
      />

      {/* 4. Movable / Floating Panels */}
      {/* Floating Elements Panel */}
      <FloatingElementsPanel
        isOpen={activeFloatingPanel === 'elements'}
        onClose={() => setActiveFloatingPanel(null)}
        onAddElement={(type) => handleAddElementType(type)}
      />

      {/* Floating Style Properties Panel (Custom Scoped CSS) */}
      <FloatingStylePanel
        isOpen={activeFloatingPanel === 'style'}
        onClose={() => setActiveFloatingPanel(null)}
        customCss={customCss}
        onChangeCustomCss={setCustomCss}
      />

      {/* Floating Settings Panel (Form-level configuration) */}
      <FloatingSettingsPanel
        isOpen={activeFloatingPanel === 'settings'}
        onClose={() => setActiveFloatingPanel(null)}
        form={form}
        formTitle={titleInput}
        onChangeFormTitle={setTitleInput}
        onNavigateToSubmissions={() => navigate(`/forms/${id}/data`)}
      />

      {/* 5. Sticky Centered Bottom Toolbar */}
      <footer className="form-builder-app__bottom-toolbar">
        <div className="form-builder-app__toolbar-pill">
          <button
            type="button"
            className={`form-builder-app__toolbar-btn ${
              activeFloatingPanel === 'elements' ? 'active' : ''
            }`}
            onClick={() => handleToggleFloatingPanel('elements')}
            id="toolbar-btn-elements"
            title="Open draggable Elements panel"
          >
            <span className="material-icon">widgets</span>
            <span>Elements</span>
          </button>

          <button
            type="button"
            className={`form-builder-app__toolbar-btn ${
              activeFloatingPanel === 'style' ? 'active' : ''
            }`}
            onClick={() => handleToggleFloatingPanel('style')}
            id="toolbar-btn-style"
            title="Open Form Style Properties (Custom Scoped CSS)"
          >
            <span className="material-icon">palette</span>
            <span>Style Properties</span>
          </button>

          <button
            type="button"
            className={`form-builder-app__toolbar-btn ${
              activeFloatingPanel === 'settings' ? 'active' : ''
            }`}
            onClick={() => handleToggleFloatingPanel('settings')}
            id="toolbar-btn-settings"
            title="Open Form Settings & Version Management"
          >
            <span className="material-icon">tune</span>
            <span>Settings</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
