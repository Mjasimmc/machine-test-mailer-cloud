import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.scss';

export interface SidebarItemProps {
  to: string;
  icon?: React.ReactNode;
  label: string;
  id?: string;
  end?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  to,
  icon,
  label,
  id,
  end = false,
}) => {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        id={id}
        className={({ isActive }) =>
          `sidebar-item ${isActive ? 'sidebar-item--active active' : ''}`
        }
      >
        {icon && (
          <span className="sidebar-item__icon">
            {typeof icon === 'string' ? <span className="material-icon">{icon}</span> : icon}
          </span>
        )}
        <span className="sidebar-item__label">{label}</span>
      </NavLink>
    </li>
  );
};
