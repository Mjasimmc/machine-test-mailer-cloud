import React from 'react';
import { NavLink } from 'react-router-dom';
import { Role } from '@saas/shared';
import { useAuth } from '../../app/providers/AuthProvider';
import { Button } from '../Button/Button';
import { Badge } from '../Badge/Badge';
import { SidebarNavigation } from './SidebarNavigation';
import { SidebarItem } from './SidebarItem';
import './Sidebar.scss';

export interface SidebarProps {
  children?: React.ReactNode;
  brandName?: string;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  children,
  brandName = 'SaaS Core',
  className = '',
}) => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;

  return (
    <aside className={`sidebar ${className}`.trim()} id="app-sidebar">
      <div className="sidebar__brand">
        <NavLink
          to={isAdmin ? '/admin/dashboard' : '/dashboard'}
          className="sidebar__brand-link"
        >
          <span className="material-icon sidebar__brand-icon">bolt</span>
          <span>{brandName}</span>
        </NavLink>
        <Badge variant={isAdmin ? 'info' : 'neutral'} size="small">
          {isAdmin ? 'Admin' : 'Member'}
        </Badge>
      </div>

      <div className="sidebar__content">
        {children ? (
          children
        ) : (
          <SidebarNavigation>
            {isAdmin ? (
              <>
                <SidebarItem
                  to="/admin/dashboard"
                  icon="dashboard"
                  label="Dashboard"
                  id="nav-admin-dashboard"
                />
                <SidebarItem
                  to="/admin/users"
                  icon="group"
                  label="Users"
                  id="nav-admin-users"
                />
                <SidebarItem
                  to="/profile"
                  icon="person"
                  label="Profile"
                  id="nav-admin-profile"
                />
              </>
            ) : (
              <>
                <SidebarItem
                  to="/dashboard"
                  icon="dashboard"
                  label="Dashboard"
                  id="nav-user-dashboard"
                />
                <SidebarItem
                  to="/forms"
                  icon="description"
                  label="Forms"
                  id="nav-user-forms"
                />
                <SidebarItem
                  to="/profile"
                  icon="person"
                  label="Profile"
                  id="nav-user-profile"
                />
              </>
            )}
          </SidebarNavigation>
        )}

        <div className="sidebar__footer">
          <Button
            variant="ghost"
            fullWidth
            onClick={logout}
            id="sidebar-logout-btn"
            style={{ justifyContent: 'flex-start' }}
          >
            <span className="material-icon" style={{ marginRight: '8px' }}>logout</span>
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};
