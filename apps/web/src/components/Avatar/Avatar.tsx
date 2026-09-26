import React from 'react';
import './Avatar.scss';

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = '',
  src,
  size = 'md',
  className = '',
}) => {
  const getInitials = (str: string): string => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className={`avatar avatar--${size} ${className}`.trim()} aria-label={name}>
      {src ? (
        <img src={src} alt={name} className="avatar__img" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};
