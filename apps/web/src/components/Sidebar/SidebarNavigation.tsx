import React from 'react';
import './Sidebar.scss';

export interface SidebarNavigationProps {
  children: React.ReactNode;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ children }) => {
  return (
    <nav className="sidebar-nav">
      <ul className="sidebar-nav__list">{children}</ul>
    </nav>
  );
};
