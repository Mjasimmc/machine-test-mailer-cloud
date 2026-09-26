import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { Avatar } from '../Avatar/Avatar';
import './ProfileTile.scss';

export interface ProfileTileProps {
  name?: string;
  email?: string;
  onClick?: () => void;
  className?: string;
}

export const ProfileTile: React.FC<ProfileTileProps> = ({
  name,
  email,
  onClick,
  className = '',
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName = name || user?.name || 'User';
  const displayEmail = email || user?.email || '';

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/profile');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`profile-tile ${className}`.trim()}
      id="header-profile-tile"
      title="View your profile"
      type="button"
    >
      <Avatar name={displayName} size="sm" />
      <div className="profile-tile__info">
        <span className="profile-tile__name">{displayName}</span>
        <span className="profile-tile__email">{displayEmail}</span>
      </div>
    </button>
  );
};
