import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell, Sidebar, Header, ProfileTile, Badge } from '../../components';

const AdminLayoutComponent: React.FC = () => {
  return (
    <AppShell
      sidebar={<Sidebar />}
      header={
        <Header
          title={
            <Badge variant="info" pill>
              Administration
            </Badge>
          }
          actions={<ProfileTile />}
        />
      }
    >
      <Outlet />
    </AppShell>
  );
};

export const AdminLayout = React.memo(AdminLayoutComponent);
AdminLayout.displayName = 'AdminLayout';

