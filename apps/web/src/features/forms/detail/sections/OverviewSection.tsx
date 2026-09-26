import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormDto, isDataField } from '@saas/shared';
import { Badge, Button } from '../../../../components';
import { FormDetailTab } from '../FormDetailPage.types';

interface OverviewSectionProps {
  form: FormDto;
  onNavigateTab: (tab: FormDetailTab) => void;
  onRefresh: () => Promise<void>;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  form,
  onNavigateTab,
}) => {
  const navigate = useNavigate();
  const [copiedLink, setCopiedLink] = useState(false);

  const versions = form.versions || [];
  // Find currently deployed version
  const deployedVersion =
    form.deployedVersion ||
    versions.find((v) => v.id === form.deployedVersionId || v.isDeployed) ||
    null;

  // Find latest draft version (sorted highest version number)
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const latestVersion = sortedVersions[0] || deployedVersion;
  const latestDraft = sortedVersions.find((v) => !v.isDeployed && v.id !== form.deployedVersionId) || latestVersion;

  // Total interactive data fields in current latest version
  const currentElements = latestVersion?.elements || [];
  const interactiveFieldsCount = currentElements.filter((el) => isDataField(el.type)).length;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const copyPublicUrl = () => {
    if (!form.publicId) return;
    const url = `${window.location.origin}/f/${form.publicId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isDeployed = !!deployedVersion;

  return (
    <div className="form-detail-overview" id="section-overview">
      {/* 1. High Visibility Deployment Banner */}
      <div
        className={`form-detail-overview__deployment-banner ${
          isDeployed ? 'is-deployed' : 'is-draft'
        }`}
        id="overview-deployment-banner"
      >
        <div className="form-detail-overview__deployment-info">
          <div className="form-detail-overview__deployment-status-row">
            <span
              className={`form-detail-overview__status-indicator ${
                isDeployed ? 'deployed-pulse' : 'draft-pulse'
              }`}
            />
            <span className="form-detail-overview__status-text">
              {isDeployed ? 'DEPLOYED' : 'DRAFT ONLY'}
            </span>
            {isDeployed && (
              <Badge variant="success" pill>
                Version {deployedVersion.versionNumber}
              </Badge>
            )}
          </div>

          <div className="form-detail-overview__deployment-details">
            {isDeployed ? (
              <>
                <h3 className="form-detail-overview__deployment-title">
                  Production Form is Live
                </h3>
                <p className="form-detail-overview__deployment-subtitle">
                  Version {deployedVersion.versionNumber} published on{' '}
                  <strong>{formatDate(deployedVersion.updatedAt || deployedVersion.createdAt)}</strong>.
                  Public submissions are currently open.
                </p>
                <div className="form-detail-overview__public-link-bar">
                  <span className="form-detail-overview__public-label">Live Link:</span>
                  <code className="form-detail-overview__public-url">
                    {window.location.origin}/f/{form.publicId}
                  </code>
                  <button
                    type="button"
                    className="form-detail-overview__copy-link-btn"
                    onClick={copyPublicUrl}
                    id="copy-deployed-link-btn"
                  >
                    {copiedLink ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-icon" style={{ fontSize: '14px' }}>check</span>
                        Copied
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-icon" style={{ fontSize: '14px' }}>content_copy</span>
                        Copy Link
                      </span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="form-detail-overview__deployment-title">
                  No Active Production Deployment
                </h3>
                <p className="form-detail-overview__deployment-subtitle">
                  This form has not been published yet. Edit the current draft and click Deploy to launch Version 1 to production.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Primary Header Actions */}
        <div className="form-detail-overview__deployment-actions">
          {isDeployed && (
            <Button
              variant="primary"
              onClick={() => window.open(`/f/${form.publicId}`, '_blank')}
              id="overview-open-deployed-btn"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Open Live Form
                <span className="material-icon" style={{ fontSize: '14px' }}>open_in_new</span>
              </span>
            </Button>
          )}

          <Button
            variant={isDeployed ? 'secondary' : 'primary'}
            onClick={() => navigate(`/forms/${form.id}/edit`)}
            id="overview-edit-draft-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>edit</span>
              Edit Working Draft
            </span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => window.open(`/forms/${form.id}/preview`, '_blank')}
            id="overview-preview-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>visibility</span>
              Preview Draft
            </span>
          </Button>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="form-detail-overview__metrics-grid">
        <div className="form-detail-overview__metric-card" id="metric-submissions">
          <div className="form-detail-overview__metric-icon" style={{ color: '#0284c7', backgroundColor: '#e0f2fe' }}>
            <span className="material-icon" style={{ fontSize: '24px' }}>bar_chart</span>
          </div>
          <div className="form-detail-overview__metric-body">
            <span className="form-detail-overview__metric-label">Total Submissions</span>
            <span className="form-detail-overview__metric-value">
              {form.submissionsCount !== undefined ? form.submissionsCount : 0}
            </span>
            <button
              type="button"
              className="form-detail-overview__metric-link"
              onClick={() => onNavigateTab('data')}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                View records in table
                <span className="material-icon" style={{ fontSize: '14px' }}>arrow_forward</span>
              </span>
            </button>
          </div>
        </div>

        <div className="form-detail-overview__metric-card" id="metric-fields">
          <div className="form-detail-overview__metric-icon" style={{ color: '#4f46e5', backgroundColor: '#eef2ff' }}>
            <span className="material-icon" style={{ fontSize: '24px' }}>list_alt</span>
          </div>
          <div className="form-detail-overview__metric-body">
            <span className="form-detail-overview__metric-label">Form Fields</span>
            <span className="form-detail-overview__metric-value">
              {interactiveFieldsCount}
            </span>
            <button
              type="button"
              className="form-detail-overview__metric-link"
              onClick={() => onNavigateTab('fields')}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Inspect structural fields
                <span className="material-icon" style={{ fontSize: '14px' }}>arrow_forward</span>
              </span>
            </button>
          </div>
        </div>

        <div className="form-detail-overview__metric-card" id="metric-versions">
          <div className="form-detail-overview__metric-icon" style={{ color: '#059669', backgroundColor: '#ecfdf5' }}>
            <span className="material-icon" style={{ fontSize: '24px' }}>history</span>
          </div>
          <div className="form-detail-overview__metric-body">
            <span className="form-detail-overview__metric-label">Total Versions</span>
            <span className="form-detail-overview__metric-value">
              {form.versionsCount || versions.length || 1}
            </span>
            <button
              type="button"
              className="form-detail-overview__metric-link"
              onClick={() => onNavigateTab('versions')}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Manage drafts & versions
                <span className="material-icon" style={{ fontSize: '14px' }}>arrow_forward</span>
              </span>
            </button>
          </div>
        </div>

        <div className="form-detail-overview__metric-card" id="metric-last-updated">
          <div className="form-detail-overview__metric-icon" style={{ color: '#d97706', backgroundColor: '#fef3c7' }}>
            <span className="material-icon" style={{ fontSize: '24px' }}>schedule</span>
          </div>
          <div className="form-detail-overview__metric-body">
            <span className="form-detail-overview__metric-label">Last Updated</span>
            <span className="form-detail-overview__metric-value" style={{ fontSize: '1.1rem' }}>
              {formatDate(form.updatedAt)}
            </span>
            <span className="form-detail-overview__metric-subtext">
              Created {formatDate(form.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Two-Column Detailed Information Cards */}
      <div className="form-detail-overview__details-row">
        {/* Left Column: Version & Structural Snapshot */}
        <div className="form-detail-overview__panel-card">
          <div className="form-detail-overview__panel-header">
            <div>
              <h4 className="form-detail-overview__panel-title">Form Version State</h4>
              <p className="form-detail-overview__panel-desc">
                Current structural source of truth across drafts and deployments
              </p>
            </div>
            <Button
              variant="secondary"
              size="small"
              onClick={() => onNavigateTab('versions')}
              id="overview-view-all-versions-btn"
            >
              View All ({versions.length})
            </Button>
          </div>

          <div className="form-detail-overview__panel-content">
            <div className="form-detail-overview__version-summary-item">
              <div className="form-detail-overview__version-summary-left">
                <Badge variant={isDeployed ? 'success' : 'neutral'} withDot>
                  {isDeployed ? `Live v${deployedVersion.versionNumber}` : 'Not Deployed'}
                </Badge>
                <div>
                  <div className="form-detail-overview__version-title">
                    {isDeployed ? deployedVersion.title : 'No deployed version'}
                  </div>
                  <div className="form-detail-overview__version-meta">
                    {isDeployed
                      ? `${deployedVersion.elements?.length || 0} total elements · Updated ${formatDate(deployedVersion.updatedAt)}`
                      : 'Deploy a draft to start collecting live responses'}
                  </div>
                </div>
              </div>
              {isDeployed && (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => window.open(`/forms/${form.id}/preview?version=${deployedVersion.id}`, '_blank')}
                  >
                    Preview
                  </Button>
                </div>
              )}
            </div>

            {latestDraft && latestDraft.id !== deployedVersion?.id && (
              <div className="form-detail-overview__version-summary-item draft-highlight">
                <div className="form-detail-overview__version-summary-left">
                  <Badge variant="info" pill>
                    Draft v{latestDraft.versionNumber}
                  </Badge>
                  <div>
                    <div className="form-detail-overview__version-title">
                      {latestDraft.title} (Work in Progress)
                    </div>
                    <div className="form-detail-overview__version-meta">
                      {latestDraft.elements?.length || 0} elements · Created {formatDate(latestDraft.createdAt)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => navigate(`/forms/${form.id}/edit?version=${latestDraft.id}`)}
                  >
                    Edit Draft
                  </Button>
                </div>
              </div>
            )}

            {/* Quick compare banner if draft and deployed version both exist */}
            {isDeployed && latestDraft && latestDraft.id !== deployedVersion.id && (
              <div className="form-detail-overview__compare-callout">
                <div>
                  <strong>Draft v{latestDraft.versionNumber} differs from live production v{deployedVersion.versionNumber}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Compare structural changes, added/removed fields before deploying.
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => onNavigateTab('versions')}
                  id="overview-compare-versions-btn"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Compare Versions
                    <span className="material-icon" style={{ fontSize: '14px' }}>arrow_forward</span>
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity & Quick Navigation */}
        <div className="form-detail-overview__panel-card">
          <div className="form-detail-overview__panel-header">
            <div>
              <h4 className="form-detail-overview__panel-title">Recent Activity</h4>
              <p className="form-detail-overview__panel-desc">
                Latest updates, deployments, and submissions
              </p>
            </div>
            <Button
              variant="secondary"
              size="small"
              onClick={() => onNavigateTab('activity')}
              id="overview-view-all-activity-btn"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Full Log
                <span className="material-icon" style={{ fontSize: '14px' }}>arrow_forward</span>
              </span>
            </Button>
          </div>

          <div className="form-detail-overview__panel-content">
            {(!form.activities || form.activities.length === 0) ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No activity recorded yet
              </div>
            ) : (
              <div className="form-detail-overview__activity-mini-list">
                {form.activities.slice(0, 4).map((act) => (
                  <div key={act.id} className="form-detail-overview__activity-mini-item">
                    <span className="form-detail-overview__activity-dot" />
                    <div className="form-detail-overview__activity-content">
                      <div className="form-detail-overview__activity-top">
                        <span className="form-detail-overview__activity-title">{act.title}</span>
                        <span className="form-detail-overview__activity-time">
                          {formatDate(act.timestamp)}
                        </span>
                      </div>
                      <div className="form-detail-overview__activity-desc">{act.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="form-detail-overview__quick-links">
              <span className="form-detail-overview__quick-links-title">Quick Actions:</span>
              <div className="form-detail-overview__quick-links-row">
                <button
                  type="button"
                  className="form-detail-overview__quick-tag"
                  onClick={() => onNavigateTab('fields')}
                >
                  Fields Schema
                </button>
                <button
                  type="button"
                  className="form-detail-overview__quick-tag"
                  onClick={() => onNavigateTab('data')}
                >
                  Submissions Table
                </button>
                <button
                  type="button"
                  className="form-detail-overview__quick-tag"
                  onClick={() => onNavigateTab('deployments')}
                >
                  Deployments History
                </button>
                <button
                  type="button"
                  className="form-detail-overview__quick-tag"
                  onClick={() => onNavigateTab('settings')}
                >
                  Form Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
