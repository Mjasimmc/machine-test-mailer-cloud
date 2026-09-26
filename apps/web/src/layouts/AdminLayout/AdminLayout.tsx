import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell, Sidebar, Header, ProfileTile, Badge } from '../../components';

export const AdminLayout: React.FC = () => {
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
