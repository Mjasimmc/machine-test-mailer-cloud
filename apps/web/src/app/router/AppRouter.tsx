import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicRoute } from './PublicRoute';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
import { AdminLayout } from '../../layouts/AdminLayout/AdminLayout';
import { UserLayout } from '../../layouts/UserLayout/UserLayout';
import { LoginPage } from '../../features/auth/LoginPage';
import { RegisterPage } from '../../features/auth/RegisterPage';
import { AccountSuspendedPage } from '../../features/auth/AccountSuspendedPage';
import { UserDashboardPage } from '../../features/dashboard/UserDashboardPage';
import { AdminDashboardPage } from '../../features/admin/AdminDashboardPage';
import { AdminUsersPage } from '../../features/admin/AdminUsersPage';
import { ProfilePage } from '../../features/profile/ProfilePage';
import { FormsPage } from '../../features/forms/FormsPage';
import { FormEditorPage } from '../../features/forms/FormEditorPage';
import { FormPreviewPage } from '../../features/forms/FormPreviewPage';
import { FormDataPage } from '../../features/forms/FormDataPage';
import { FormDetailPage } from '../../features/forms/detail/FormDetailPage';
import { PublicFormPage } from '../../features/forms/PublicFormPage';
import { NotFoundPage } from '../../features/misc/NotFoundPage';
import { useAuth } from '../providers/AuthProvider';
import { Role } from '@saas/shared';

import { Spinner } from '../../components/Spinner/Spinner';

const RootRedirect: React.FC = () => {
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

  if (user.role === Role.ADMIN) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const RoleAwareLayout: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === Role.ADMIN) {
    return <AdminLayout />;
  }
  return <UserLayout />;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Root redirection */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public auth routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Public form view route (unauthenticated) */}
      <Route path="/f/:publicId" element={<PublicFormPage />} />

      {/* Account suspended dedicated page */}
      <Route path="/account-suspended" element={<AccountSuspendedPage />} />

      {/* Profile / Settings route adapting to user's role */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleAwareLayout />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Dedicated Full-Screen Form Builder Workspace */}
      <Route element={<ProtectedRoute />}>
        <Route path="/forms/:id/edit" element={<FormEditorPage />} />
        <Route path="/forms/:id/preview" element={<FormPreviewPage />} />
      </Route>

      {/* User protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<UserLayout />}>
          <Route path="/dashboard" element={<UserDashboardPage />} />
          <Route path="/forms" element={<FormsPage />} />
          <Route path="/forms/:id" element={<FormDetailPage />} />
          <Route path="/forms/:id/data" element={<FormDataPage />} />
        </Route>
      </Route>

      {/* Admin protected routes */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
