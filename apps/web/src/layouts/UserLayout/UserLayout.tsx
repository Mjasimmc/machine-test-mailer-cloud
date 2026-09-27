import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell, WorkspaceHeader } from '../../components';

const UserLayoutComponent: React.FC = () => {
  return (
    <AppShell header={<WorkspaceHeader />}>
      <Outlet />
    </AppShell>
  );
};

export const UserLayout = React.memo(UserLayoutComponent);
UserLayout.displayName = 'UserLayout';


