import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { Role } from '@saas/shared';
import { Spinner } from '../../components/Spinner/Spinner';

export const PublicRoute: React.FC = () => {
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

  if (token && user) {
    if (user.role === Role.ADMIN) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
