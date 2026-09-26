import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { ProfileTile } from '../ProfileTile/ProfileTile';
import './ProfileMenu.scss';

export interface ProfileMenuProps {
  className?: string;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className={`profile-menu ${className}`.trim()} ref={menuRef}>
      <ProfileTile onClick={() => setIsOpen((prev) => !prev)} />

      {isOpen && (
        <div className="profile-menu__dropdown" role="menu">
          <button
            type="button"
            className="profile-menu__item"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              navigate('/profile');
            }}
          >
            <span className="material-icon" style={{ fontSize: '18px', marginRight: '8px' }}>person</span> View Profile
          </button>
          <hr className="profile-menu__divider" />
          <button
            type="button"
            className="profile-menu__item profile-menu__item--danger"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
          >
            <span className="material-icon" style={{ fontSize: '18px', marginRight: '8px' }}>logout</span> Sign out
          </button>
        </div>
      )}
    </div>
  );
};
