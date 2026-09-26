import React, { useState } from 'react';
import { FormDeploymentDto, FormDto } from '@saas/shared';
import { formsService } from '../../../../services/forms.service';
import { Alert, Badge, Button, ConfirmDialog } from '../../../../components';

interface DeploymentsSectionProps {
  form: FormDto;
  onRefresh: () => Promise<void>;
}

export const DeploymentsSection: React.FC<DeploymentsSectionProps> = ({
  form,
  onRefresh,
}) => {
  const [rollbackDeployment, setRollbackDeployment] = useState<FormDeploymentDto | null>(null);
  const [isRollbacking, setIsRollbacking] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const deployments = form.deployments || [];
  const deployedVersionId = form.deployedVersionId;

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

  const handleConfirmRollback = async () => {
    if (!rollbackDeployment) return;
    setIsRollbacking(true);
    setNotification(null);
    try {
      await formsService.deployVersion(form.id, rollbackDeployment.versionId);
      setNotification({
        type: 'success',
        message: `Successfully redeployed / rolled back to Version ${rollbackDeployment.versionNumber}!`,
      });
      setRollbackDeployment(null);
      await onRefresh();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to rollback deployment',
      });
    } finally {
      setIsRollbacking(false);
    }
  };

  return (
    <div className="form-detail-deployments" id="section-deployments">
      {/* 1. Header */}
      <div className="form-detail-deployments__header">
        <div>
          <h3 className="form-detail-deployments__title">Production Deployments</h3>
          <p className="form-detail-deployments__subtitle">
            Chronological audit of production releases. Roll back to any previous deployment with single-click verification.
          </p>
        </div>

        {form.deployedVersionId && form.publicId && (
          <Button
            variant="primary"
            size="small"
            onClick={() => window.open(`/f/${form.publicId}`, '_blank')}
            id="deployments-open-live-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Open Live Form
              <span className="material-icon" style={{ fontSize: '14px' }}>open_in_new</span>
            </span>
          </Button>
        )}
      </div>

      {notification && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert variant={notification.type}>{notification.message}</Alert>
        </div>
      )}

      {/* 2. Deployments List */}
      {deployments.length === 0 ? (
        <div className="form-detail-deployments__empty">
          <span className="material-icon" style={{ fontSize: '48px', color: 'var(--color-text-muted)' }}>
            rocket_launch
          </span>
          <h4>No Deployments Yet</h4>
          <p>
            This form has not been deployed to production. Visit the Versions section or Editor to deploy your first version.
          </p>
        </div>
      ) : (
        <div className="form-detail-deployments__list">
          {deployments.map((d: FormDeploymentDto, idx: number) => {
            const isCurrent = d.isCurrent || (idx === 0 && d.versionId === deployedVersionId);

            return (
              <div
                key={d.id || idx}
                className={`form-detail-deployments__card ${isCurrent ? 'is-current' : 'is-superseded'}`}
                id={`deployment-card-${d.versionNumber}`}
              >
                <div className="form-detail-deployments__card-left">
                  <div className="form-detail-deployments__card-header-row">
                    <span className="version-pill">Version {d.versionNumber}</span>

                    {isCurrent ? (
                      <Badge variant="success" withDot>
                        CURRENT PRODUCTION
                      </Badge>
                    ) : (
                      <Badge variant="neutral">SUPERSEDED</Badge>
                    )}

                    <span className="timestamp">Deployed {formatDate(d.deployedAt)}</span>
                  </div>

                  <div className="form-detail-deployments__notes">
                    {d.notes || `Production release of Version ${d.versionNumber}`}
                  </div>

                  <div className="form-detail-deployments__meta-row">
                    <span>
                      Deployed By: <strong>{d.deployedBy || 'Workspace Member'}</strong>
                    </span>
                    <span>
                      Public Endpoint: <code>/f/{form.publicId}</code>
                    </span>
                  </div>
                </div>

                <div className="form-detail-deployments__card-right">
                  {isCurrent ? (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => window.open(`/f/${form.publicId}`, '_blank')}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Test Live Form
                        <span className="material-icon" style={{ fontSize: '14px' }}>open_in_new</span>
                      </span>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setRollbackDeployment(d)}
                      id={`rollback-btn-v${d.versionNumber}`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-icon" style={{ fontSize: '14px' }}>history</span>
                        Rollback to v{d.versionNumber}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rollback Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!rollbackDeployment}
        onClose={() => setRollbackDeployment(null)}
        onConfirm={handleConfirmRollback}
        title={`Rollback to Version ${rollbackDeployment?.versionNumber}?`}
        message={
          <div>
            <p>
              Are you sure you want to rollback production to{' '}
              <strong>Version {rollbackDeployment?.versionNumber}</strong>?
            </p>
            <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              This will update the live public form at <code>/f/{form.publicId}</code> to Version {rollbackDeployment?.versionNumber}. Any subsequent visitor submissions will be recorded against Version {rollbackDeployment?.versionNumber}.
            </p>
          </div>
        }
        confirmLabel={`Redeploy Version ${rollbackDeployment?.versionNumber}`}
        confirmVariant="primary"
        isLoading={isRollbacking}
      />
    </div>
  );
};
