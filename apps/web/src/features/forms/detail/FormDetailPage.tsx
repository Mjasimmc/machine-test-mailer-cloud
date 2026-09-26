import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FormDto } from '@saas/shared';
import { formsService } from '../../../services/forms.service';
import {
  Alert,
  Badge,
  Button,
  ContentContainer,
  Spinner,
} from '../../../components';
import { FormDetailTab, FormTabItem } from './FormDetailPage.types';
import { OverviewSection } from './sections/OverviewSection';
import { FieldsSection } from './sections/FieldsSection';
import { DataSection } from './sections/DataSection';
import { VersionsSection } from './sections/VersionsSection';
import { DeploymentsSection } from './sections/DeploymentsSection';
import { ActivitySection } from './sections/ActivitySection';
import { SettingsSection } from './sections/SettingsSection';
import './FormDetailPage.scss';

export const FormDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active section tab from URL (defaults to overview)
  const currentTab = (searchParams.get('tab') as FormDetailTab) || 'overview';

  const [form, setForm] = useState<FormDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForm = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await formsService.getOne(id);
      setForm(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load form details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  const handleTabChange = (tab: FormDetailTab) => {
    setSearchParams({ tab });
  };

  if (loading) {
    return (
      <ContentContainer size="wide">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spinner size="large" />
        </div>
      </ContentContainer>
    );
  }

  if (error || !form) {
    return (
      <ContentContainer size="wide">
        <div style={{ margin: 'var(--space-6) 0' }}>
          <Alert variant="error">{error || 'Form not found'}</Alert>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button variant="secondary" onClick={() => navigate('/forms')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icon" style={{ fontSize: '16px' }}>arrow_back</span>
                Back to Forms
              </span>
            </Button>
          </div>
        </div>
      </ContentContainer>
    );
  }

  const versions = form.versions || [];
  const deployedVersion =
    form.deployedVersion ||
    versions.find((v) => v.id === form.deployedVersionId || v.isDeployed) ||
    null;
  const isDeployed = !!deployedVersion;

  // Latest draft version
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const latestDraft = sortedVersions.find((v) => !v.isDeployed && v.id !== form.deployedVersionId) || sortedVersions[0];

  // Secondary navigation tabs definition
  const tabs: FormTabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'dashboard',
    },
    {
      id: 'fields',
      label: 'Fields',
      icon: 'format_list_bulleted',
      badge: latestDraft?.elements?.length || 0,
    },
    {
      id: 'data',
      label: 'Data',
      icon: 'table_chart',
      badge: form.submissionsCount !== undefined ? form.submissionsCount : 0,
    },
    {
      id: 'versions',
      label: 'Versions',
      icon: 'history',
      badge: form.versionsCount || versions.length || 1,
    },
    {
      id: 'deployments',
      label: 'Deployments',
      icon: 'rocket_launch',
      badge: form.deployments?.length || (isDeployed ? 1 : 0),
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: 'schedule',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
    },
  ];

  return (
    <ContentContainer size="wide">
      <div className="form-detail-page" id="form-detail-page-container">
        {/* Top Management Header Bar */}
        <header className="form-detail-page__header">
          <div className="form-detail-page__header-left">
            <div className="form-detail-page__header-breadcrumbs">
              <button
                type="button"
                className="breadcrumb-link"
                onClick={() => navigate('/forms')}
                id="breadcrumb-forms"
              >
                Forms
              </button>
              <span>/</span>
              <span>{form.name}</span>
            </div>

            <div className="form-detail-page__header-title-row">
              <h1 className="form-detail-page__header-title" id="form-detail-name">
                {form.name}
              </h1>

              {isDeployed ? (
                <Badge variant="success" withDot>
                  v{deployedVersion.versionNumber} Deployed
                </Badge>
              ) : (
                <Badge variant="neutral">Not Deployed</Badge>
              )}

              <code
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  padding: '2px var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {form.publicId}
              </code>
            </div>
          </div>

          {/* Quick Primary Actions in Header */}
          <div className="form-detail-page__header-actions">
            {isDeployed && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => window.open(`/f/${form.publicId}`, '_blank')}
                id="header-open-live-btn"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Open Form
                  <span className="material-icon" style={{ fontSize: '14px' }}>open_in_new</span>
                </span>
              </Button>
            )}

            <Button
              variant="primary"
              size="small"
              onClick={() =>
                navigate(
                  latestDraft
                    ? `/forms/${form.id}/edit?version=${latestDraft.id}`
                    : `/forms/${form.id}/edit`,
                )
              }
              id="header-edit-draft-btn"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icon" style={{ fontSize: '16px' }}>edit</span>
                Edit Latest Draft
              </span>
            </Button>

            <Button
              variant="ghost"
              size="small"
              onClick={() =>
                window.open(
                  latestDraft
                    ? `/forms/${form.id}/preview?version=${latestDraft.id}`
                    : `/forms/${form.id}/preview`,
                  '_blank',
                )
              }
              id="header-preview-btn"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icon" style={{ fontSize: '16px' }}>visibility</span>
                Preview
              </span>
            </Button>
          </div>
        </header>

        {/* Main Body: Secondary Sidebar Nav + Section Content */}
        <div className="form-detail-page__body">
          {/* Secondary Navigation Sidebar */}
          <aside className="form-detail-page__sidebar" aria-label="Form management navigation">
            <nav className="form-detail-page__sidebar-nav">
              {tabs.map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`form-detail-page__sidebar-item ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleTabChange(tab.id)}
                    id={`nav-tab-${tab.id}`}
                  >
                    <div className="item-left">
                      <span className="material-icon item-icon" style={{ fontSize: '18px' }}>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </div>

                    {tab.badge !== undefined && (
                      <span className="item-badge">{tab.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Active Section Main Canvas */}
          <main className="form-detail-page__content" id="form-detail-active-section">
            {currentTab === 'overview' && (
              <OverviewSection
                form={form}
                onNavigateTab={handleTabChange}
                onRefresh={loadForm}
              />
            )}

            {currentTab === 'fields' && <FieldsSection form={form} />}

            {currentTab === 'data' && (
              <DataSection form={form} onRefreshForm={loadForm} />
            )}

            {currentTab === 'versions' && (
              <VersionsSection
                form={form}
                onRefresh={loadForm}
                onNavigateTab={handleTabChange}
              />
            )}

            {currentTab === 'deployments' && (
              <DeploymentsSection form={form} onRefresh={loadForm} />
            )}

            {currentTab === 'activity' && <ActivitySection form={form} />}

            {currentTab === 'settings' && (
              <SettingsSection form={form} onRefresh={loadForm} />
            )}
          </main>
        </div>
      </div>
    </ContentContainer>
  );
};
