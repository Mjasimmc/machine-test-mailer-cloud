import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormDto, FormVersionDto, isDataField } from '@saas/shared';
import { formsService } from '../../../../services/forms.service';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
} from '../../../../components';
import { VersionComparisonModal } from './VersionComparisonModal';
import { FormDetailTab } from '../FormDetailPage.types';

interface VersionsSectionProps {
  form: FormDto;
  onRefresh: () => Promise<void>;
  onNavigateTab: (tab: FormDetailTab) => void;
}

export const VersionsSection: React.FC<VersionsSectionProps> = ({
  form,
  onRefresh,
  onNavigateTab,
}) => {
  const navigate = useNavigate();

  const [deployTargetVersion, setDeployTargetVersion] = useState<FormVersionDto | null>(null);
  const [isDeployingDraft, setIsDeployingDraft] = useState(false);
  const [isDeployingVersion, setIsDeployingVersion] = useState(false);

  // Comparison modal state
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [comparisonSourceId, setComparisonSourceId] = useState<string | undefined>();
  const [comparisonTargetId, setComparisonTargetId] = useState<string | undefined>();

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const versions = form.versions || [];
  // Sort descending by version number
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const deployedVersionId = form.deployedVersionId;
  const draft = form.draft;

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

  // Deploy Current Draft
  const handleDeployDraft = async () => {
    setIsDeployingDraft(true);
    setNotification(null);
    try {
      const updated = await formsService.deploy(form.id);
      const newV = updated.deployedVersion;
      setNotification({
        type: 'success',
        message: `Version ${newV?.versionNumber} ("${newV?.title}") has been deployed and published to live production!`,
      });
      await onRefresh();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to deploy draft',
      });
    } finally {
      setIsDeployingDraft(false);
    }
  };

  // Re-activate specific historical deployment version
  const handleConfirmDeployHistoricalVersion = async () => {
    if (!deployTargetVersion) return;
    setIsDeployingVersion(true);
    setNotification(null);
    try {
      await formsService.deployVersion(form.id, deployTargetVersion.id);
      setNotification({
        type: 'success',
        message: `Version ${deployTargetVersion.versionNumber} ("${deployTargetVersion.title}") is now the active live production version!`,
      });
      setDeployTargetVersion(null);
      await onRefresh();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to activate version',
      });
    } finally {
      setIsDeployingVersion(false);
    }
  };

  // Launch comparison tool between target version and deployed
  const handleOpenComparison = (versionId: string) => {
    setComparisonSourceId(versionId);
    setComparisonTargetId(deployedVersionId || sortedVersions[0]?.id);
    setComparisonModalOpen(true);
  };

  const draftInteractiveFields = (draft?.elements || []).filter((el) => isDataField(el.type)).length;
  const draftSectionsCount = draft?.sections?.length || 1;

  return (
    <div className="form-detail-versions" id="section-versions">
      {/* 1. Section Header Bar */}
      <div className="form-detail-versions__header">
        <div>
          <h3 className="form-detail-versions__title">Deployment Versions & Lifecycle</h3>
          <p className="form-detail-versions__subtitle">
            This form uses a single-draft, deployment-versioning model. The working draft is private and continuously editable; deployment creates immutable production versions.
          </p>
        </div>

        <div className="form-detail-versions__header-actions">
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              setComparisonSourceId(sortedVersions[0]?.id);
              setComparisonTargetId(deployedVersionId || sortedVersions[1]?.id);
              setComparisonModalOpen(true);
            }}
            disabled={versions.length < 2}
            id="open-comparison-tool-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>compare_arrows</span>
              Compare Versions
            </span>
          </Button>

          <Button
            variant="primary"
            size="small"
            onClick={() => navigate(`/forms/${form.id}/edit`)}
            id="edit-current-draft-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>edit</span>
              Open in Form Editor
            </span>
          </Button>
        </div>
      </div>

      {notification && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert variant={notification.type}>{notification.message}</Alert>
        </div>
      )}

      {/* 2. Current Draft Working State Card */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h4 style={{ fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
          Current Working Draft
        </h4>
        <div
          className="form-detail-versions__card is-draft"
          style={{
            borderLeft: '4px solid var(--color-primary)',
            backgroundColor: 'rgba(79, 70, 229, 0.02)',
          }}
          id="current-draft-card"
        >
          <div className="form-detail-versions__card-main">
            <div className="form-detail-versions__card-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="form-detail-versions__version-tag" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--color-primary)' }}>
                  Current Draft
                </span>
                {form.hasUnpublishedChanges ? (
                  <Badge variant="warning" withDot>
                    UNPUBLISHED DRAFT CHANGES
                  </Badge>
                ) : (
                  <Badge variant="success" withDot>
                    UP TO DATE WITH PRODUCTION
                  </Badge>
                )}
              </div>

              <span className="form-detail-versions__timestamp">
                Last edited {formatDate(draft?.updatedAt || form.updatedAt)}
              </span>
            </div>

            <h4 className="form-detail-versions__card-title">
              {draft?.title || form.name}
            </h4>

            {/* Structural Summary */}
            <div className="form-detail-versions__summary-chips">
              <span className="summary-chip" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span className="material-icon" style={{ fontSize: '14px', marginRight: '4px' }}>list_alt</span>
                {draftInteractiveFields} {draftInteractiveFields === 1 ? 'Data Field' : 'Data Fields'}
              </span>
              <span className="summary-chip" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span className="material-icon" style={{ fontSize: '14px', marginRight: '4px' }}>view_quilt</span>
                {draftSectionsCount} {draftSectionsCount === 1 ? 'Section' : 'Sections'}
              </span>
              <span className="summary-chip" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span className="material-icon" style={{ fontSize: '14px', marginRight: '4px' }}>dashboard_customize</span>
                {draft?.formLayout || 'column'} layout
              </span>
            </div>
          </div>

          <div className="form-detail-versions__card-actions">
            <Button
              variant="primary"
              size="small"
              onClick={() => navigate(`/forms/${form.id}/edit`)}
              id="btn-open-editor-from-draft"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icon" style={{ fontSize: '14px' }}>edit</span>
                Edit Draft
              </span>
            </Button>

            <Button
              variant="secondary"
              size="small"
              onClick={() => window.open(`/forms/${form.id}/preview`, '_blank')}
              id="btn-preview-draft"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icon" style={{ fontSize: '14px' }}>visibility</span>
                Preview Draft
              </span>
            </Button>

            <Button
              variant="primary"
              size="small"
              onClick={handleDeployDraft}
              isLoading={isDeployingDraft}
              id="btn-deploy-draft-direct"
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icon" style={{ fontSize: '14px' }}>rocket_launch</span>
                Deploy to Production
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Immutable Deployment History List */}
      <div>
        <h4 style={{ fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
          Deployment History (Immutable Snapshots)
        </h4>

        {sortedVersions.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-8)',
              textAlign: 'center',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span className="material-icon" style={{ fontSize: '32px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
              history_edu
            </span>
            <p style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
              No production deployment versions yet
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              When you deploy the current draft, an immutable Version 1 snapshot will be created here and made live.
            </p>
            <Button variant="primary" size="small" onClick={handleDeployDraft} isLoading={isDeployingDraft}>
              Deploy Draft as Version 1
            </Button>
          </div>
        ) : (
          <div className="form-detail-versions__list">
            {sortedVersions.map((v) => {
              const isDeployed = v.id === deployedVersionId || v.isDeployed;
              const interactiveFields = (v.elements || []).filter((el) => isDataField(el.type)).length;
              const sectionsCount = v.sections?.length || 1;

              return (
                <div
                  key={v.id}
                  className={`form-detail-versions__card ${isDeployed ? 'is-deployed' : 'is-draft'}`}
                  id={`version-card-${v.versionNumber}`}
                >
                  {/* Left Column: Number, Status, Meta */}
                  <div className="form-detail-versions__card-main">
                    <div className="form-detail-versions__card-header-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className="form-detail-versions__version-tag">
                          Version {v.versionNumber}
                        </span>

                        {isDeployed ? (
                          <Badge variant="success" withDot>
                            ACTIVE LIVE PRODUCTION
                          </Badge>
                        ) : (
                          <Badge variant="neutral">HISTORICAL DEPLOYMENT</Badge>
                        )}
                      </div>

                      <span className="form-detail-versions__timestamp">
                        Deployed {formatDate(v.updatedAt || v.createdAt)}
                      </span>
                    </div>

                    <h4 className="form-detail-versions__card-title">{v.title}</h4>

                    {/* Structural Summary */}
                    <div className="form-detail-versions__summary-chips">
                      <span className="summary-chip" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span className="material-icon" style={{ fontSize: '14px', marginRight: '4px' }}>list_alt</span>
                        {interactiveFields} {interactiveFields === 1 ? 'Data Field' : 'Data Fields'}
                      </span>
                      <span className="summary-chip" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span className="material-icon" style={{ fontSize: '14px', marginRight: '4px' }}>view_quilt</span>
                        {sectionsCount} {sectionsCount === 1 ? 'Section' : 'Sections'}
                      </span>
                      <span className="summary-chip" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span className="material-icon" style={{ fontSize: '14px', marginRight: '4px' }}>dashboard_customize</span>
                        {v.formLayout || 'column'} layout
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="form-detail-versions__card-actions">
                    {/* Preview this historical version snapshot */}
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() =>
                        window.open(`/forms/${form.id}/preview?version=${v.id}`, '_blank')
                      }
                      id={`preview-version-btn-${v.versionNumber}`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-icon" style={{ fontSize: '14px' }}>visibility</span>
                        Preview Snapshot
                      </span>
                    </Button>

                    {/* Compare with active deployed */}
                    {deployedVersionId && !isDeployed && (
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => handleOpenComparison(v.id)}
                        title="Compare differences against currently active deployed version"
                        id={`compare-version-btn-${v.versionNumber}`}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-icon" style={{ fontSize: '14px' }}>compare_arrows</span>
                          Diff vs Active
                        </span>
                      </Button>
                    )}

                    {/* Re-deploy action */}
                    {!isDeployed ? (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => setDeployTargetVersion(v)}
                        id={`redeploy-version-btn-${v.versionNumber}`}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-icon" style={{ fontSize: '14px' }}>restore</span>
                          Re-activate
                        </span>
                      </Button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <div className="form-detail-versions__active-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-icon" style={{ fontSize: '14px' }}>check_circle</span>
                          Currently Live
                        </div>
                        {onNavigateTab && (
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => onNavigateTab('deployments')}
                            title="View production deployment history"
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              Deployments
                              <span className="material-icon" style={{ fontSize: '14px' }}>arrow_forward</span>
                            </span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Re-activate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deployTargetVersion}
        onClose={() => setDeployTargetVersion(null)}
        onConfirm={handleConfirmDeployHistoricalVersion}
        title={`Re-activate Version ${deployTargetVersion?.versionNumber} in Production?`}
        message={
          <div>
            <p>
              You are about to re-activate <strong>Version {deployTargetVersion?.versionNumber}</strong> ("{deployTargetVersion?.title}") as the active live production version of <strong>{form.name}</strong>.
            </p>
            <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Public visitors to <code>/f/{form.publicId}</code> will immediately see this form structure. All historical submissions remain safely preserved.
            </p>
          </div>
        }
        confirmLabel="Re-activate Version"
        confirmVariant="primary"
        isLoading={isDeployingVersion}
      />

      {/* Version Comparison Modal */}
      {comparisonModalOpen && (
        <VersionComparisonModal
          isOpen={comparisonModalOpen}
          onClose={() => setComparisonModalOpen(false)}
          form={form}
          initialSourceVersionId={comparisonSourceId}
          initialTargetVersionId={comparisonTargetId}
          onDeployVersion={async (vId) => {
            await formsService.deployVersion(form.id, vId);
            await onRefresh();
          }}
        />
      )}
    </div>
  );
};
