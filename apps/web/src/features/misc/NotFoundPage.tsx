import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { Role } from '@saas/shared';
import { AuthLayout, EmptyState, Button } from '../../components';

export const NotFoundPage: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  let targetLink = '/login';
  let targetLabel = 'Go to Sign In';

  if (token && user) {
    if (user.role === Role.ADMIN) {
      targetLink = '/admin/dashboard';
      targetLabel = 'Back to Admin Dashboard';
    } else {
      targetLink = '/dashboard';
      targetLabel = 'Back to Dashboard';
    }
  }

  return (
    <AuthLayout>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        <EmptyState
          icon={<span className="material-icon" style={{ fontSize: '36px' }}>search</span>}
          title="404 - Page Not Found"
          description="The page you are looking for doesn't exist, has been moved, or is inaccessible."
          action={
            <Button
              variant="primary"
              onClick={() => navigate(targetLink)}
              id="not-found-back-btn"
            >
              {targetLabel}
            </Button>
          }
        />
      </div>
    </AuthLayout>
  );
};
