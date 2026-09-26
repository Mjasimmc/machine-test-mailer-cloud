import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FormDto,
  FormVersionDto,
  isDataField,
  extractAllElements,
  formatSubmissionData,
} from '@saas/shared';
import { formsService } from '../../services/forms.service';
import { Spinner, Alert } from '../../components';
import { PublicFormView } from './public/PublicFormView';
import './FormPreviewPage.scss';

export const FormPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedVersionId = searchParams.get('version');

  const [form, setForm] = useState<FormDto | null>(null);
  const [activeVersion, setActiveVersion] = useState<FormVersionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preview testing state
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [mobileWidth, setMobileWidth] = useState<number>(375);
  const [testValues, setTestValues] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<Record<string, any> | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isDataDrawerOpen, setIsDataDrawerOpen] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    const loadFormData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const data = await formsService.getOne(id);
        setForm(data);

        if (requestedVersionId && data.versions) {
          const selected = data.versions.find((v) => v.id === requestedVersionId);
          if (selected) {
            setActiveVersion(selected);
            return;
          }
        }

        if (data.draft) {
          setActiveVersion({
            id: 'draft',
            formId: data.id,
            versionNumber: (data.deployedVersion?.versionNumber || 0) + 1,
            title: data.draft.title || data.name,
            elements: data.draft.elements || [],
            sections: data.draft.sections || [],
            formLayout: data.draft.formLayout || 'column',
            customCss: data.draft.customCss || '',
            isDeployed: false,
            createdAt: data.draft.updatedAt || new Date().toISOString(),
            updatedAt: data.draft.updatedAt || new Date().toISOString(),
          });
        } else if (data.versions && data.versions.length > 0) {
          const selected =
            data.versions.find((v) => v.id === data.deployedVersionId) ||
            data.versions[data.versions.length - 1];

          setActiveVersion(selected || data.versions[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load form preview');
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, [id, requestedVersionId]);

  const allElements = activeVersion
    ? activeVersion.sections && activeVersion.sections.length > 0
      ? extractAllElements(activeVersion.sections)
      : activeVersion.elements || []
    : [];

  const dataFields = allElements.filter((el) => isDataField(el.type));

  const getUserFriendlyData = () => {
    const result: Record<string, any> = {};
    for (const field of dataFields) {
      const key = field.reference || field.id;
      const rawVal = testValues[key] !== undefined ? testValues[key] : testValues[field.id];
      if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
        result[field.label || field.name || 'Field'] = rawVal;
      }
    }
    return result;
  };

  const handleReset = () => {
    setTestValues({});
    setValidationErrors({});
    setSubmitted(false);
    setSubmittedData(null);
  };

  const handleFieldChange = (key: string, val: any) => {
    setTestValues((prev) => ({ ...prev, [key]: val }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleTestSubmit = (e: React.FormEvent, formattedData: Record<string, any>) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    for (const field of dataFields) {
      const key = field.reference || field.id;
      const rawVal = testValues[key] !== undefined ? testValues[key] : testValues[field.id];
      const val = rawVal !== undefined ? rawVal : field.defaultValue;

      // Required validation
      if (field.required) {
        if (
          val === undefined ||
          val === null ||
          val === '' ||
          (Array.isArray(val) && val.length === 0)
        ) {
          newErrors[key] = `${field.label || field.name || 'This field'} is required`;
          continue;
        }
      }

      // Length and numerical bounds checks
      if (val !== undefined && val !== null && val !== '') {
        const strVal = String(val);
        if (field.validation?.minLength !== undefined && strVal.length < field.validation.minLength) {
          newErrors[key] = `Must be at least ${field.validation.minLength} characters`;
          continue;
        }
        if (field.validation?.maxLength !== undefined && strVal.length > field.validation.maxLength) {
          newErrors[key] = `Cannot exceed ${field.validation.maxLength} characters`;
          continue;
        }
        if (field.type === 'number') {
          const numVal = Number(val);
          if (!isNaN(numVal)) {
            if (field.validation?.min !== undefined && numVal < field.validation.min) {
              newErrors[key] = `Minimum value is ${field.validation.min}`;
              continue;
            }
            if (field.validation?.max !== undefined && numVal > field.validation.max) {
              newErrors[key] = `Maximum value is ${field.validation.max}`;
              continue;
            }
          }
        }
      }

      // Regex validation
      if (
        field.validation?.enabled &&
        field.validation.pattern &&
        val !== undefined &&
        val !== null &&
        val !== ''
      ) {
        try {
          const reg = new RegExp(field.validation.pattern);
          if (!reg.test(String(val))) {
            newErrors[key] = field.validation.errorMessage || 'Invalid format';
          }
        } catch {
          // ignore regex errors in preview
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      setSubmitted(false);
      setSubmittedData(null);
      return;
    }

    setValidationErrors({});
    setSubmitted(true);
    setSubmittedData(formattedData);
    setIsDataDrawerOpen(true);
  };

  const copyJsonPayload = () => {
    const payload = submittedData || getUserFriendlyData();
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
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

  if (error || !form || !activeVersion) {
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
        <div style={{ color: '#f87171', fontSize: '15px' }}>{error || 'Form not found'}</div>
        <button
          type="button"
          onClick={() => navigate(id ? `/forms/${id}` : '/forms')}
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
            Return to Form Builder
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="form-preview-page">
      {/* 1. Sticky Preview Header */}
      <header className="form-preview-page__header">
        <div className="form-preview-page__header-left">
          <button
            type="button"
            className="form-preview-page__back-btn"
            onClick={() => navigate(`/forms/${id}`)}
            title="Back to Form Builder"
          >
            <span className="material-icon">arrow_back</span>
            <span>Back to Builder</span>
          </button>

          <div className="form-preview-page__title">
            <span>{activeVersion.title || form.name}</span>
            <span className="form-preview-page__badge">
              v{activeVersion.versionNumber} Preview
            </span>
          </div>
        </div>

        {/* Center: Viewport Switcher */}
        <div className="form-preview-page__header-center">
          <div className="form-preview-page__viewport-switcher">
            <button
              type="button"
              className={`form-preview-page__viewport-btn ${
                previewDevice === 'desktop' ? 'active' : ''
              }`}
              onClick={() => setPreviewDevice('desktop')}
            >
              <span className="material-icon">desktop_windows</span>
              <span>Desktop</span>
            </button>
            <button
              type="button"
              className={`form-preview-page__viewport-btn ${
                previewDevice === 'tablet' ? 'active' : ''
              }`}
              onClick={() => setPreviewDevice('tablet')}
            >
              <span className="material-icon">tablet_mac</span>
              <span>Tablet</span>
            </button>
            <button
              type="button"
              className={`form-preview-page__viewport-btn ${
                previewDevice === 'mobile' ? 'active' : ''
              }`}
              onClick={() => setPreviewDevice('mobile')}
            >
              <span className="material-icon">phone_iphone</span>
              <span>Mobile</span>
            </button>
          </div>

          {previewDevice === 'mobile' && (
            <div className="form-preview-page__mobile-slider" title="Mobile width (320px - 420px)">
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
        </div>

        {/* Right: Actions */}
        <div className="form-preview-page__header-right">
          <button
            type="button"
            className="form-preview-page__action-btn"
            onClick={handleReset}
            title="Clear all test inputs"
          >
            <span className="material-icon">refresh</span>
            <span>Reset</span>
          </button>

          <button
            type="button"
            className="form-preview-page__action-btn"
            onClick={() => setIsDataDrawerOpen((prev) => !prev)}
            title="Inspect submitted payload data"
          >
            <span className="material-icon">data_object</span>
            <span>{isDataDrawerOpen ? 'Hide Data' : 'Inspect Data'}</span>
          </button>
        </div>
      </header>

      {/* 2. Main Full-Screen Canvas Area */}
      <main className="form-preview-page__workspace">
        {submitted && (
          <div style={{ maxWidth: '640px', width: '100%', marginBottom: '16px' }}>
            <Alert variant="success" title="Simulated Submission Succeeded!">
              Form validation passed. You can inspect the submitted values in the
              inspector below.
            </Alert>
          </div>
        )}

        <div
          className={`form-preview-page__canvas-frame form-preview-page__canvas-frame--${previewDevice}`}
          style={
            previewDevice === 'mobile'
              ? { width: `${mobileWidth}px`, maxWidth: `${mobileWidth}px` }
              : undefined
          }
        >
          <PublicFormView
            formLayout={activeVersion.formLayout || 'column'}
            sections={activeVersion.sections || []}
            elements={activeVersion.elements || []}
            previewDevice={previewDevice}
            values={testValues}
            onChange={handleFieldChange}
            errors={validationErrors}
            onSubmit={(e) => handleTestSubmit(e, formatSubmissionData(allElements, testValues))}
            customCss={activeVersion.customCss}
            formId={form.id}
          />
        </div>
      </main>

      {/* 3. Collapsible Data Structure Inspector */}
      {isDataDrawerOpen && (
        <div className="form-preview-page__data-drawer">
          <div
            className="form-preview-page__data-drawer__header"
            onClick={() => setIsDataDrawerOpen(false)}
          >
            <div className="form-preview-page__data-drawer__title">
              <span className="material-icon">schema</span>
              <span>
                {submitted ? 'Submitted Data' : 'Live Form Data'}
              </span>
            </div>
            <div
              className="form-preview-page__data-drawer__actions"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="form-preview-page__action-btn"
                onClick={copyJsonPayload}
                style={{ padding: '3px 8px', fontSize: '11px' }}
              >
                <span className="material-icon">content_copy</span>
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>
              <button
                type="button"
                className="form-preview-page__action-btn"
                onClick={() => setIsDataDrawerOpen(false)}
                style={{ padding: '3px 8px', fontSize: '11px' }}
              >
                <span className="material-icon">close</span>
              </button>
            </div>
          </div>
          <div className="form-preview-page__data-drawer__content">
            <pre>
              {JSON.stringify(submittedData || getUserFriendlyData(), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
