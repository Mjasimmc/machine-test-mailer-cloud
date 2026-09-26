import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell, WorkspaceHeader } from '../../components';

export const UserLayout: React.FC = () => {
  return (
    <AppShell header={<WorkspaceHeader />}>
      <Outlet />
    </AppShell>
  );
};

