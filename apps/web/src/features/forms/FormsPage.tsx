import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormDto } from '@saas/shared';
import { formsService } from '../../services/forms.service';
import {
  PageHeader,
  ContentContainer,
  Button,
  DataTable,
  Column,
  Badge,
  Dialog,
  FormField,
  FormLabel,
  Input,
  Alert,
  EmptyState,
} from '../../components';

export const FormsPage: React.FC = () => {
  const [forms, setForms] = useState<FormDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Form Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Copy feedback state
  const [copiedPublicId, setCopiedPublicId] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadForms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await formsService.getAll();
      setForms(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setCreateError('Form name is required');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const created = await formsService.create({ name: formName.trim() });
      setIsCreateOpen(false);
      setFormName('');
      // Navigate straight to the editor of the newly created form
      navigate(`/forms/${created.id}`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create form');
      setIsSubmitting(false);
    }
  };

  const copyPublicUrl = (publicId: string) => {
    const url = `${window.location.origin}/f/${publicId}`;
    navigator.clipboard.writeText(url);
    setCopiedPublicId(publicId);
    setTimeout(() => {
      setCopiedPublicId(null);
    }, 2000);
  };

  const columns: Column<FormDto>[] = [
    {
      key: 'name',
      header: 'Form Name',
      render: (form: FormDto) => (
        <div>
          <button
            type="button"
            onClick={() => navigate(`/forms/${form.id}`)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-primary)',
              fontWeight: 'var(--font-weight-semibold)',
              cursor: 'pointer',
              textAlign: 'left',
              padding: 0,
              fontSize: 'var(--font-size-base)',
            }}
            id={`form-link-${form.id}`}
          >
            {form.name}
          </button>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {form.versionsCount || 0} {(form.versionsCount || 0) === 1 ? 'deployment' : 'deployments'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Deployment Status',
      render: (form: FormDto) => {
        const isDeployed = !!form.deployedVersionId;
        const versionLabel = form.deployedVersion
          ? `v${form.deployedVersion.versionNumber}`
          : isDeployed
          ? 'Deployed'
          : null;

        return isDeployed ? (
          <Badge variant="success" withDot>
            {versionLabel} Live
          </Badge>
        ) : (
          <Badge variant="neutral">Draft (Unpublished)</Badge>
        );
      },
    },
    {
      key: 'publicUrl',
      header: 'Public URL',
      render: (form: FormDto) => {
        const isCopied = copiedPublicId === form.publicId;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <code
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-bg-tertiary)',
                padding: '2px var(--space-2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              /f/{form.publicId}
            </code>
            <Button
              variant="secondary"
              size="small"
              onClick={() => copyPublicUrl(form.publicId)}
              id={`copy-url-${form.id}`}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icon" style={{ fontSize: '14px' }}>
                  {isCopied ? 'check' : 'content_copy'}
                </span>
                {isCopied ? 'Copied' : 'Copy Link'}
              </span>
            </Button>
            <a
              href={`/f/${form.publicId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-primary)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Open public page in new tab"
            >
              <span className="material-icon" style={{ fontSize: '16px' }}>open_in_new</span>
            </a>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (form: FormDto) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button
            variant="ghost"
            size="small"
            onClick={() => navigate(`/forms/${form.id}?tab=data`)}
            id={`open-data-btn-${form.id}`}
          >
            Submissions
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate(`/forms/${form.id}/edit`)}
            id={`open-editor-btn-${form.id}`}
          >
            Editor
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={() => navigate(`/forms/${form.id}`)}
            id={`open-detail-btn-${form.id}`}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Manage
              <span className="material-icon" style={{ fontSize: '14px' }}>arrow_forward</span>
            </span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ContentContainer>
      <PageHeader
        title="Forms"
        description="Create and manage your forms, draft versions, and deployments"
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setIsCreateOpen(true);
              setCreateError(null);
            }}
            id="create-form-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>add</span>
              Create Form
            </span>
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {!loading && forms.length === 0 ? (
        <EmptyState
          icon={<span className="material-icon" style={{ fontSize: '36px' }}>description</span>}
          title="No forms created yet"
          description="Build your first form by giving it a name. You can manage multiple draft versions and publish anytime."
          action={
            <Button
              variant="primary"
              onClick={() => {
                setIsCreateOpen(true);
                setCreateError(null);
              }}
              id="empty-create-form-btn"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icon" style={{ fontSize: '16px' }}>add</span>
                Create Form
              </span>
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={forms}
          keyExtractor={(f) => f.id}
          isLoading={loading}
          emptyMessage="No forms found"
        />
      )}

      {/* Create Form Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsCreateOpen(false);
            setFormName('');
          }
        }}
        title="Create New Form"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="create-form-modal"
              isLoading={isSubmitting}
              id="submit-create-form-btn"
            >
              Create Form
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateForm} id="create-form-modal">
          {createError && <Alert variant="error">{createError}</Alert>}

          <FormField>
            <FormLabel htmlFor="new-form-name" required>
              Form Name
            </FormLabel>
            <Input
              id="new-form-name"
              placeholder="e.g. Sample Form, Intake Form"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              required
            />
          </FormField>
        </form>
      </Dialog>
    </ContentContainer>
  );
};
