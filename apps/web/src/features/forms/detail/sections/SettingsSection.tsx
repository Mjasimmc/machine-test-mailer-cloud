import React, { useState } from 'react';
import { FormDto, FormSettingsDto } from '@saas/shared';
import { formsService } from '../../../../services/forms.service';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  FormField,
  FormLabel,
  Input,
  Textarea,
} from '../../../../components';

interface SettingsSectionProps {
  form: FormDto;
  onRefresh: () => Promise<void>;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  form,
  onRefresh,
}) => {
  const currentSettings: FormSettingsDto = form.settings || {};

  // Form identity state
  const [formName, setFormName] = useState(form.name || '');

  // Submission config state
  const [isAcceptingSubmissions, setIsAcceptingSubmissions] = useState<boolean>(
    currentSettings.isAcceptingSubmissions !== false,
  );
  const [submissionLimit, setSubmissionLimit] = useState<string>(
    currentSettings.submissionLimit !== undefined && currentSettings.submissionLimit !== null
      ? String(currentSettings.submissionLimit)
      : '',
  );
  const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState<boolean>(
    currentSettings.allowMultipleSubmissions !== false,
  );
  const [successMessage, setSuccessMessage] = useState(
    currentSettings.successMessage || 'Thank you! Your response has been submitted successfully.',
  );
  const [redirectUrl, setRedirectUrl] = useState(currentSettings.redirectUrl || '');
  const [closedMessage, setClosedMessage] = useState(
    currentSettings.closedMessage || 'This form is currently closed and not accepting new responses.',
  );

  // Notifications state
  const [notifyOnSubmission, setNotifyOnSubmission] = useState<boolean>(
    !!currentSettings.notifyOnSubmission,
  );
  const [notificationEmails, setNotificationEmails] = useState(
    (currentSettings.notificationEmails || []).join(', '),
  );

  // Integrations state
  const [webhookUrl, setWebhookUrl] = useState(currentSettings.webhookUrl || '');

  // Status state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setSaveError('Form name is required');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const emailList = notificationEmails
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const parsedLimit = submissionLimit.trim() ? parseInt(submissionLimit.trim(), 10) : null;

      await formsService.updateSettings(form.id, {
        name: formName.trim(),
        settings: {
          isAcceptingSubmissions,
          submissionLimit: isNaN(parsedLimit as any) ? null : parsedLimit,
          allowMultipleSubmissions,
          successMessage: successMessage.trim(),
          redirectUrl: redirectUrl.trim(),
          closedMessage: closedMessage.trim(),
          notifyOnSubmission,
          notificationEmails: emailList,
          webhookUrl: webhookUrl.trim(),
        },
      });

      setSaveSuccess('Form configuration settings saved successfully!');
      await onRefresh();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="form-detail-settings" id="section-settings">
      <div className="form-detail-settings__header">
        <div>
          <h3 className="form-detail-settings__title">Form-Level Settings</h3>
          <p className="form-detail-settings__subtitle">
            Configure submission policies, access permissions, notifications, and webhook integrations outside the editor canvas.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert variant="success">{saveSuccess}</Alert>
        </div>
      )}

      {saveError && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert variant="error">{saveError}</Alert>
        </div>
      )}

      <form onSubmit={handleSaveSettings} id="form-settings-form">
        {/* 1. General Form Identity Card */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <CardHeader
            title="General Identity"
            description="Basic naming and public identifiers for this form"
          />
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              <FormField>
                <FormLabel htmlFor="settings-form-name" required>
                  Form Display Name
                </FormLabel>
                <Input
                  id="settings-form-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Sample Form, General Intake"
                  required
                />
              </FormField>

              <FormField>
                <FormLabel htmlFor="settings-public-id">
                  Public Slug / Identifier
                </FormLabel>
                <Input
                  id="settings-public-id"
                  value={form.publicId || ''}
                  disabled
                  readOnly
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* 2. Submission Configuration Card */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <CardHeader
            title="Submission Configuration"
            description="Control how submissions are accepted, capped, and confirmed"
          />
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Accepting Submissions Toggle */}
              <div className="form-detail-settings__toggle-row">
                <div>
                  <div className="toggle-title">Accepting Submissions</div>
                  <div className="toggle-desc">
                    When active, live visitors can submit responses. Turn off to temporarily pause all incoming submissions.
                  </div>
                </div>
                <label className="settings-switch">
                  <input
                    type="checkbox"
                    checked={isAcceptingSubmissions}
                    onChange={(e) => setIsAcceptingSubmissions(e.target.checked)}
                    id="toggle-accept-submissions"
                  />
                  <span className="settings-slider" />
                </label>
              </div>

              {!isAcceptingSubmissions && (
                <FormField>
                  <FormLabel htmlFor="settings-closed-message">
                    Closed Form Notice
                  </FormLabel>
                  <Input
                    id="settings-closed-message"
                    value={closedMessage}
                    onChange={(e) => setClosedMessage(e.target.value)}
                    placeholder="This form is currently closed..."
                  />
                </FormField>
              )}

              {/* Submission Limits */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                <FormField>
                  <FormLabel htmlFor="settings-submission-limit">
                    Submission Limit (Optional)
                  </FormLabel>
                  <Input
                    id="settings-submission-limit"
                    type="number"
                    min="1"
                    value={submissionLimit}
                    onChange={(e) => setSubmissionLimit(e.target.value)}
                    placeholder="Leave blank for unlimited"
                  />
                </FormField>

                <div className="form-detail-settings__toggle-row" style={{ border: 'none', padding: 0 }}>
                  <div>
                    <div className="toggle-title">Allow Multiple Submissions</div>
                    <div className="toggle-desc">
                      Allow a user or device to submit more than once
                    </div>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={allowMultipleSubmissions}
                      onChange={(e) => setAllowMultipleSubmissions(e.target.checked)}
                      id="toggle-allow-multiple"
                    />
                    <span className="settings-slider" />
                  </label>
                </div>
              </div>

              {/* Success Message & Redirect */}
              <FormField>
                <FormLabel htmlFor="settings-success-message">
                  Confirmation Message
                </FormLabel>
                <Textarea
                  id="settings-success-message"
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  placeholder="Thank you for your response!"
                  rows={2}
                />
              </FormField>

              <FormField>
                <FormLabel htmlFor="settings-redirect-url">
                  Post-Submission Redirect URL (Optional)
                </FormLabel>
                <Input
                  id="settings-redirect-url"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://yourwebsite.com/thank-you"
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* 3. Notifications & Integrations Card */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <CardHeader
            title="Notifications & Webhooks"
            description="Forward submission events to external systems or team emails"
          />
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Notification Toggle */}
              <div className="form-detail-settings__toggle-row">
                <div>
                  <div className="toggle-title">Email Notifications</div>
                  <div className="toggle-desc">
                    Send an alert whenever a new response is submitted
                  </div>
                </div>
                <label className="settings-switch">
                  <input
                    type="checkbox"
                    checked={notifyOnSubmission}
                    onChange={(e) => setNotifyOnSubmission(e.target.checked)}
                    id="toggle-notifications"
                  />
                  <span className="settings-slider" />
                </label>
              </div>

              {notifyOnSubmission && (
                <FormField>
                  <FormLabel htmlFor="settings-notification-emails">
                    Recipient Emails (comma-separated)
                  </FormLabel>
                  <Input
                    id="settings-notification-emails"
                    value={notificationEmails}
                    onChange={(e) => setNotificationEmails(e.target.value)}
                    placeholder="team@example.com, manager@example.com"
                  />
                </FormField>
              )}

              {/* Webhook integration */}
              <FormField>
                <FormLabel htmlFor="settings-webhook-url">
                  Webhook Payload URL (Optional)
                </FormLabel>
                <Input
                  id="settings-webhook-url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  A JSON POST request will be triggered on every verified submission with full field values.
                </div>
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Save button bar */}
        <div className="form-detail-settings__footer-bar">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            id="save-settings-btn"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icon" style={{ fontSize: '16px' }}>save</span>
              Save Settings
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
};
