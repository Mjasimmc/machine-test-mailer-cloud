import React, { useState } from 'react';
import { FormDto } from '@saas/shared';
import { FloatingPanel } from './FloatingPanel';
import './FloatingSettingsPanel.scss';

export interface FloatingSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  form: FormDto;
  formTitle: string;
  onChangeFormTitle: (title: string) => void;
  onNavigateToSubmissions: () => void;
}

export const FloatingSettingsPanel: React.FC<FloatingSettingsPanelProps> = ({
  isOpen,
  onClose,
  form,
  formTitle,
  onChangeFormTitle,
  onNavigateToSubmissions,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const copyPublicUrl = () => {
    if (!form.publicId) return;
    const url = `${window.location.origin}/f/${form.publicId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const deployedVersion = form.deployedVersion;

  return (
    <FloatingPanel
      title="Form Settings"
      icon="tune"
      isOpen={isOpen}
      onClose={onClose}
      width={400}
      defaultPosition={{ x: Math.round(window.innerWidth / 2 - 200), y: window.innerHeight - 560 }}
    >
      <div className="settings-panel-content">
        {/* Form Identity */}
        <div className="settings-group">
          <span className="settings-group__title">Form Identity</span>
          <div className="settings-field">
            <label htmlFor="settings-form-name">Form Display Name</label>
            <input
              id="settings-form-name"
              type="text"
              value={formTitle}
              onChange={(e) => onChangeFormTitle(e.target.value)}
              placeholder="Enter form title..."
            />
          </div>
          <div className="settings-field">
            <label>Public Slug / Identifier</label>
            <input type="text" value={form.publicId || 'Unassigned'} disabled readOnly />
          </div>
        </div>

        {/* Deployment Status */}
        <div className="settings-group">
          <span className="settings-group__title">Deployment Status</span>
          <div style={{ padding: '8px 12px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '12px', marginBottom: '8px' }}>
            {deployedVersion ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#059669', fontWeight: 600 }}>● Live Version {deployedVersion.versionNumber}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{form.hasUnpublishedChanges ? 'Draft modified' : 'Up to date'}</span>
              </div>
            ) : (
              <span style={{ color: 'var(--color-text-secondary)' }}>Draft Only (Unpublished)</span>
            )}
          </div>
        </div>

        {/* Public Sharing & Submissions */}
        <div className="settings-group">
          <span className="settings-group__title">Sharing & Responses</span>
          <div className="settings-btn-row">
            <button
              type="button"
              className="settings-btn"
              onClick={copyPublicUrl}
              disabled={!form.deployedVersionId}
              title={form.deployedVersionId ? 'Copy live public link' : 'Deploy a version first'}
            >
              <span className="material-icon">content_copy</span>
              <span>{copiedLink ? 'Copied URL!' : 'Copy Share Link'}</span>
            </button>

            {form.deployedVersionId && form.publicId && (
              <button
                type="button"
                className="settings-btn"
                onClick={() => window.open(`/f/${form.publicId}`, '_blank')}
              >
                <span className="material-icon">open_in_new</span>
                <span>Open Live Form</span>
              </button>
            )}
          </div>

          <div style={{ marginTop: '4px' }}>
            <button
              type="button"
              className="settings-btn settings-btn--primary"
              onClick={onNavigateToSubmissions}
              style={{ width: '100%' }}
            >
              <span className="material-icon">bar_chart</span>
              <span>View Submitted Responses</span>
            </button>
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
};
