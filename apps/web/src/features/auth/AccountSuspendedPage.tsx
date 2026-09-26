import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout, AuthCard, Button, Alert } from '../../components';

export const AccountSuspendedPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const saved =
      sessionStorage.getItem('suspended_email') ||
      localStorage.getItem('last_user_email') ||
      '';
    setEmail(saved);
  }, []);

  return (
    <AuthLayout>
      <AuthCard
        title="Account Suspended"
        subtitle="Access to this platform has been terminated"
        footer={
          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate('/login')}
            id="back-to-login-btn"
          >
            Return to Login
          </Button>
        }
      >
        <Alert variant="error" title="Access Revoked">
          Your account has been immediately suspended by an administrator. All active sessions have been terminated.
        </Alert>

        {email && (
          <div
            id="suspended-email-box"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              textAlign: 'center',
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>Suspended Account: </span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  );
};
