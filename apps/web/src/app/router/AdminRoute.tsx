import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { Role, UserStatus } from '@saas/shared';
import { Spinner } from '../../components/Spinner/Spinner';

export const AdminRoute: React.FC = () => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: 'var(--color-bg-primary)',
        }}
      >
        <Spinner size="large" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === UserStatus.SUSPENDED) {
    return <Navigate to="/account-suspended" replace />;
  }

  if (user.role !== Role.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
