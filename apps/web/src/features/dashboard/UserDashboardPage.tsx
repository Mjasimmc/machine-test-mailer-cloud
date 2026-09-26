import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormDto, FormDataViewDto, FormActivityDto } from '@saas/shared';
import { useAuth } from '../../app/providers/AuthProvider';
import { formsService } from '../../services/forms.service';
import {
  ContentContainer,
  Button,
  Dialog,
  FormField,
  FormLabel,
  Input,
  Alert,
  Skeleton,
} from '../../components';
import './UserDashboardPage.scss';

// Relative time helper
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

interface CombinedActivityItem {
  id: string;
  type: 'submission' | 'deployed' | 'created' | 'updated';
  title: string;
  subtitle: string;
  formId: string;
  formName: string;
  timestamp: string;
  versionNumber?: number;
}

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [forms, setForms] = useState<FormDto[]>([]);
  const [dataViews, setDataViews] = useState<Record<string, FormDataViewDto>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action: Create Form Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const formsData = await formsService.getAll();
      setForms(formsData);

      // Fetch data views for forms with submissions
      const formsWithData = formsData.filter((f) => (f.submissionsCount || 0) > 0);
      const viewsMap: Record<string, FormDataViewDto> = {};

      if (formsWithData.length > 0) {
        const results = await Promise.allSettled(
          formsWithData.map((f) => formsService.getDataView(f.id))
        );

        results.forEach((res, index) => {
          if (res.status === 'fulfilled' && res.value) {
            viewsMap[formsWithData[index].id] = res.value;
          }
        });
      }

      setDataViews(viewsMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute balanced statistics
  const stats = useMemo(() => {
    const totalForms = forms.length;
    const activeForms = forms.filter((f) => Boolean(f.deployedVersionId)).length;
    const draftForms = forms.filter((f) => !f.deployedVersionId).length;
    const totalSubmissions = forms.reduce((acc, f) => acc + (f.submissionsCount || 0), 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let submissionsToday = 0;
    Object.values(dataViews).forEach((view) => {
      if (view.rows && Array.isArray(view.rows)) {
        view.rows.forEach((row) => {
          if (row.submittedAt && new Date(row.submittedAt) >= startOfToday) {
            submissionsToday++;
          }
        });
      }
    });

    return {
      activeForms,
      draftForms,
      totalSubmissions,
      submissionsToday,
      totalForms,
    };
  }, [forms, dataViews]);

  // Combined activity feed (Forms & Submissions balanced)
  const activityFeed: CombinedActivityItem[] = useMemo(() => {
    const items: CombinedActivityItem[] = [];

    // Add submission activities
    Object.entries(dataViews).forEach(([formId, view]) => {
      const parentForm = forms.find((f) => f.id === formId);
      const formTitle = parentForm?.name || view.formName || 'Form';

      if (view.rows && Array.isArray(view.rows)) {
        view.rows.forEach((row) => {
          const previewEntries: string[] = [];
          const rawData = row.data || {};
          const keys = Object.keys(rawData);

          for (const k of keys) {
            const val = rawData[k];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              const matchedCol = view.columns.find((c) => c.id === k || c.reference === k);
              const label = matchedCol?.label || k;
              previewEntries.push(`${label}: ${String(val).trim()}`);
            }
          }

          items.push({
            id: `sub-${row.id}`,
            type: 'submission',
            title: `New submission on ${formTitle}`,
            subtitle: previewEntries.slice(0, 2).join(' · ') || 'Response received',
            formId,
            formName: formTitle,
            timestamp: row.submittedAt,
            versionNumber: row.versionNumber,
          });
        });
      }
    });

    // Add form lifecycle activities
    forms.forEach((form) => {
      if (form.activities && Array.isArray(form.activities)) {
        form.activities.forEach((act: FormActivityDto) => {
          if (act.type === 'version_deployed') {
            items.push({
              id: `act-${act.id || form.id + '-' + act.timestamp}`,
              type: 'deployed',
              title: `Version deployed for ${form.name}`,
              subtitle: act.description || `Version ${act.versionNumber || ''} is now active and live`,
              formId: form.id,
              formName: form.name,
              timestamp: act.timestamp,
              versionNumber: act.versionNumber,
            });
          } else if (act.type === 'form_created' || act.type === 'version_created') {
            items.push({
              id: `act-${act.id || form.id + '-' + act.timestamp}`,
              type: 'created',
              title: act.title || `Form created: ${form.name}`,
              subtitle: act.description || 'Draft created and ready for editing',
              formId: form.id,
              formName: form.name,
              timestamp: act.timestamp,
              versionNumber: act.versionNumber,
            });
          } else if (act.type === 'field_updated' || act.type === 'settings_updated') {
            items.push({
              id: `act-${act.id || form.id + '-' + act.timestamp}`,
              type: 'updated',
              title: `Updated ${form.name}`,
              subtitle: act.description || 'Schema and settings adjusted',
              formId: form.id,
              formName: form.name,
              timestamp: act.timestamp,
            });
          }
        });
      }
    });

    // Sort newest first and limit to 6 items
    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [forms, dataViews]);

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setCreateError('Please enter a form name');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const created = await formsService.create({ name: formName.trim() });
      setIsCreateOpen(false);
      setFormName('');
      navigate(`/forms/${created.id}`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create form');
      setIsSubmitting(false);
    }
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  const getActivityIcon = (type: CombinedActivityItem['type']) => {
    switch (type) {
      case 'submission':
        return { icon: 'inbox', className: 'activity-icon--submission' };
      case 'deployed':
        return { icon: 'rocket_launch', className: 'activity-icon--deployed' };
      case 'created':
        return { icon: 'add_circle', className: 'activity-icon--created' };
      case 'updated':
      default:
        return { icon: 'edit_note', className: 'activity-icon--updated' };
    }
  };

  return (
    <ContentContainer className="workspace-dashboard">
      {/* 1. Header / Welcome Section with Balanced Actions */}
      <section className="workspace-welcome" aria-label="Workspace Welcome">
        <div className="workspace-welcome__content">
          <h1 className="workspace-welcome__title" id="dashboard-welcome-heading">
            Welcome back{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="workspace-welcome__subtitle">
            Overview of your forms, deployments, and collected submission data.
          </p>
        </div>

        <div className="workspace-welcome__actions">
          <Button
            variant="secondary"
            onClick={() => navigate('/forms')}
            id="header-view-submissions-btn"
          >
            <span className="material-icon" style={{ fontSize: '18px', marginRight: '6px' }}>
              table_chart
            </span>
            View Submissions
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setFormName('');
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            id="header-create-form-btn"
          >
            <span className="material-icon" style={{ fontSize: '18px', marginRight: '6px' }}>
              add
            </span>
            Create Form
          </Button>
        </div>
      </section>

      {error && (
        <Alert variant="error" id="dashboard-error-alert">
          {error}
        </Alert>
      )}

      {/* 2. Equal-Weight Primary Stat Cards (2 Forms, 2 Data) */}
      <section className="workspace-stats" aria-label="Key workspace statistics">
        {loading ? (
          <div className="workspace-stats__grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="workspace-stat-card workspace-stat-card--skeleton">
                <Skeleton width="40%" height="14px" />
                <Skeleton width="50%" height="32px" style={{ margin: '10px 0 6px' }} />
                <Skeleton width="75%" height="12px" />
              </div>
            ))}
          </div>
        ) : (
          <div className="workspace-stats__grid">
            {/* Stat 1: Active Forms */}
            <div className="workspace-stat-card" id="stat-active-forms">
              <div className="workspace-stat-card__header">
                <span className="workspace-stat-card__label">Active Forms</span>
                <span className="workspace-stat-card__badge workspace-stat-card__badge--live">
                  <span className="workspace-stat-card__dot" />
                  Live
                </span>
              </div>
              <div className="workspace-stat-card__value">
                {stats.activeForms.toLocaleString()}
              </div>
              <div className="workspace-stat-card__context">
                {stats.activeForms === 0
                  ? 'No published forms active'
                  : `${stats.activeForms} of ${stats.totalForms} forms deployed`}
              </div>
            </div>

            {/* Stat 2: Draft Forms */}
            <div className="workspace-stat-card" id="stat-draft-forms">
              <div className="workspace-stat-card__header">
                <span className="workspace-stat-card__label">Draft Forms</span>
                <span className="workspace-stat-card__icon-wrapper">
                  <span className="material-icon">edit_note</span>
                </span>
              </div>
              <div className="workspace-stat-card__value">
                {stats.draftForms.toLocaleString()}
              </div>
              <div className="workspace-stat-card__context">
                {stats.draftForms === 0
                  ? 'All forms published'
                  : 'In progress and ready to deploy'}
              </div>
            </div>

            {/* Stat 3: Total Submissions */}
            <div className="workspace-stat-card" id="stat-total-submissions">
              <div className="workspace-stat-card__header">
                <span className="workspace-stat-card__label">Total Submissions</span>
                <span className="workspace-stat-card__icon-wrapper">
                  <span className="material-icon">all_inbox</span>
                </span>
              </div>
              <div className="workspace-stat-card__value">
                {stats.totalSubmissions.toLocaleString()}
              </div>
              <div className="workspace-stat-card__context">
                All-time responses collected
              </div>
            </div>

            {/* Stat 4: Submissions Today */}
            <div className="workspace-stat-card" id="stat-submissions-today">
              <div className="workspace-stat-card__header">
                <span className="workspace-stat-card__label">Submissions Today</span>
                <span className="workspace-stat-card__icon-wrapper">
                  <span className="material-icon">trending_up</span>
                </span>
              </div>
              <div className="workspace-stat-card__value">
                {stats.submissionsToday.toLocaleString()}
              </div>
              <div className="workspace-stat-card__context">
                Responses captured in past 24h
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. Balanced Workspace Panels (Forms & Submissions side-by-side) */}
      <section className="workspace-panels" aria-label="Forms and Submissions panels">
        <div className="workspace-panels__grid">
          {/* Left Panel: Form Management */}
          <div className="workspace-panel" id="panel-forms-management">
            <div className="workspace-panel__header">
              <div className="workspace-panel__title-group">
                <h2 className="workspace-panel__title">Forms</h2>
                <span className="workspace-panel__badge">
                  {forms.length} {forms.length === 1 ? 'Form' : 'Forms'}
                </span>
              </div>
              <button
                type="button"
                className="workspace-panel__link-action"
                onClick={() => navigate('/forms')}
                id="forms-panel-manage-link"
              >
                Manage all
                <span className="material-icon" style={{ fontSize: '14px', marginLeft: '4px' }}>
                  arrow_forward
                </span>
              </button>
            </div>

            <div className="workspace-panel__body">
              {loading ? (
                <div className="workspace-panel__loading">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="workspace-panel__skeleton-row">
                      <Skeleton width="45%" height="16px" />
                      <Skeleton width="20%" height="24px" />
                    </div>
                  ))}
                </div>
              ) : forms.length === 0 ? (
                <div className="workspace-panel__empty" id="forms-panel-empty">
                  <span className="material-icon workspace-panel__empty-icon">description</span>
                  <div className="workspace-panel__empty-title">No forms created yet</div>
                  <p className="workspace-panel__empty-desc">
                    Create your first form to start collecting submissions.
                  </p>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setFormName('');
                      setCreateError(null);
                      setIsCreateOpen(true);
                    }}
                    style={{ marginTop: 'var(--space-3)' }}
                  >
                    + Create Form
                  </Button>
                </div>
              ) : (
                <ul className="workspace-forms-list">
                  {forms.slice(0, 5).map((form) => {
                    const isDeployed = Boolean(form.deployedVersionId);
                    const subCount = form.submissionsCount || 0;

                    return (
                      <li key={form.id} className="workspace-form-item" id={`form-item-${form.id}`}>
                        <div
                          className="workspace-form-item__main"
                          onClick={() => navigate(`/forms/${form.id}`)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              navigate(`/forms/${form.id}`);
                            }
                          }}
                        >
                          <div className="workspace-form-item__icon">
                            <span className="material-icon">
                              {isDeployed ? 'task_alt' : 'description'}
                            </span>
                          </div>
                          <div className="workspace-form-item__info">
                            <div className="workspace-form-item__name-row">
                              <span className="workspace-form-item__name">{form.name}</span>
                              <span
                                className={`workspace-form-item__status ${
                                  isDeployed
                                    ? 'workspace-form-item__status--live'
                                    : 'workspace-form-item__status--draft'
                                }`}
                              >
                                {isDeployed ? 'Live' : 'Draft'}
                              </span>
                            </div>
                            <div className="workspace-form-item__meta">
                              <span>{subCount} {subCount === 1 ? 'submission' : 'submissions'}</span>
                              <span>·</span>
                              <span>Updated {formatRelativeTime(form.updatedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="workspace-form-item__actions">
                          <button
                            type="button"
                            className="workspace-form-item__btn"
                            title="Edit Form"
                            onClick={() => navigate(`/forms/${form.id}/edit`)}
                          >
                            <span className="material-icon">edit</span>
                            <span className="workspace-form-item__btn-text">Edit</span>
                          </button>

                          <button
                            type="button"
                            className="workspace-form-item__btn"
                            title="View Submissions Data"
                            onClick={() => navigate(`/forms/${form.id}/data`)}
                          >
                            <span className="material-icon">table_chart</span>
                            <span className="workspace-form-item__btn-text">Data</span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right Panel: Recent Activity & Submissions */}
          <div className="workspace-panel" id="panel-activity-submissions">
            <div className="workspace-panel__header">
              <div className="workspace-panel__title-group">
                <h2 className="workspace-panel__title">Recent Activity</h2>
                <span className="workspace-panel__badge">Live Feed</span>
              </div>
              <button
                type="button"
                className="workspace-panel__link-action"
                onClick={() => navigate('/forms')}
                id="activity-panel-view-all-link"
              >
                View all
                <span className="material-icon" style={{ fontSize: '14px', marginLeft: '4px' }}>
                  arrow_forward
                </span>
              </button>
            </div>

            <div className="workspace-panel__body">
              {loading ? (
                <div className="workspace-panel__loading">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="workspace-panel__skeleton-row">
                      <Skeleton variant="circle" width="32px" height="32px" />
                      <div style={{ flex: 1 }}>
                        <Skeleton width="50%" height="14px" style={{ marginBottom: '4px' }} />
                        <Skeleton width="70%" height="12px" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activityFeed.length === 0 ? (
                <div className="workspace-panel__empty" id="activity-panel-empty">
                  <span className="material-icon workspace-panel__empty-icon">history</span>
                  <div className="workspace-panel__empty-title">No recent activity yet</div>
                  <p className="workspace-panel__empty-desc">
                    When forms are deployed, edited, or collect responses, updates will appear here.
                  </p>
                </div>
              ) : (
                <ul className="workspace-activity-list">
                  {activityFeed.map((item) => {
                    const { icon, className } = getActivityIcon(item.type);
                    return (
                      <li
                        key={item.id}
                        className="workspace-activity-item"
                        onClick={() => {
                          if (item.type === 'submission') {
                            navigate(`/forms/${item.formId}/data`);
                          } else {
                            navigate(`/forms/${item.formId}`);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            if (item.type === 'submission') {
                              navigate(`/forms/${item.formId}/data`);
                            } else {
                              navigate(`/forms/${item.formId}`);
                            }
                          }
                        }}
                      >
                        <div className={`workspace-activity-item__icon ${className}`}>
                          <span className="material-icon">{icon}</span>
                        </div>

                        <div className="workspace-activity-item__details">
                          <div className="workspace-activity-item__title-row">
                            <span className="workspace-activity-item__title">{item.title}</span>
                            <span className="workspace-activity-item__time">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </div>
                          <div className="workspace-activity-item__subtitle">
                            {item.subtitle}
                          </div>
                        </div>

                        <span className="material-icon workspace-activity-item__arrow">
                          chevron_right
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal Dialog: Create Form */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Form"
      >
        <form onSubmit={handleCreateForm} id="create-form-dialog">
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)',
              marginTop: 0,
              marginBottom: 'var(--space-4)',
            }}
          >
            Enter a title for your new form to start building and collecting data.
          </p>

          {createError && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Alert variant="error">{createError}</Alert>
            </div>
          )}

          <FormField>
            <FormLabel htmlFor="dashboard-form-name" required>
              Form Name
            </FormLabel>
            <Input
              id="dashboard-form-name"
              type="text"
              placeholder="e.g., Sample Form, General Intake"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              autoFocus
              required
              disabled={isSubmitting}
            />
          </FormField>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-6)',
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              id="submit-create-form-btn"
            >
              Create Form
            </Button>
          </div>
        </form>
      </Dialog>
    </ContentContainer>
  );
};
