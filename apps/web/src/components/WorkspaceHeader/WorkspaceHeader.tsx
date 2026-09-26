import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ProfileMenu } from '../ProfileMenu/ProfileMenu';
import './WorkspaceHeader.scss';

export interface WorkspaceHeaderProps {
  brandName?: string;
  className?: string;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  brandName = 'SaaS Workspace',
  className = '',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={`workspace-header ${className}`.trim()} id="workspace-top-nav">
      <div className="workspace-header__container">
        {/* Brand & Identity */}
        <div className="workspace-header__left">
          <NavLink to="/dashboard" className="workspace-header__brand" id="workspace-brand-link">
            <span className="workspace-header__logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="4" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </span>
            <span className="workspace-header__brand-text">{brandName}</span>
          </NavLink>

          {/* Desktop Navigation Links */}
          <nav className="workspace-header__nav" aria-label="Primary Navigation">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `workspace-header__nav-link ${isActive ? 'workspace-header__nav-link--active' : ''}`
              }
              id="nav-top-dashboard"
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/forms"
              className={({ isActive }) =>
                `workspace-header__nav-link ${isActive ? 'workspace-header__nav-link--active' : ''}`
              }
              id="nav-top-forms"
            >
              Forms
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `workspace-header__nav-link ${isActive ? 'workspace-header__nav-link--active' : ''}`
              }
              id="nav-top-settings"
            >
              Settings
            </NavLink>
          </nav>
        </div>

        {/* Right side Profile & Mobile Toggle */}
        <div className="workspace-header__right">
          <div className="workspace-header__profile">
            <ProfileMenu />
          </div>

          <button
            type="button"
            className="workspace-header__mobile-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="material-icon">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="workspace-header__mobile-menu">
          <nav className="workspace-header__mobile-nav">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `workspace-header__mobile-link ${isActive ? 'workspace-header__mobile-link--active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="material-icon" style={{ fontSize: '18px', marginRight: '8px' }}>dashboard</span>
              Dashboard
            </NavLink>
            <NavLink
              to="/forms"
              className={({ isActive }) =>
                `workspace-header__mobile-link ${isActive ? 'workspace-header__mobile-link--active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="material-icon" style={{ fontSize: '18px', marginRight: '8px' }}>description</span>
              Forms
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `workspace-header__mobile-link ${isActive ? 'workspace-header__mobile-link--active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="material-icon" style={{ fontSize: '18px', marginRight: '8px' }}>settings</span>
              Settings
            </NavLink>
          </nav>
        </div>
      )}
    </header>
  );
};
