import React from 'react';
import { UserDto, Role } from '@saas/shared';
import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import { UserStatusBadge } from '../UserStatusBadge/UserStatusBadge';
import { Card } from '../Card/Card';
import './ProfileCard.scss';

export interface ProfileCardProps {
  user: UserDto;
  className?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user, className = '' }) => {
  const isAdmin = user.role === Role.ADMIN;

  return (
    <Card className={className}>
      <div className="profile-card">
        <div className="profile-card__avatar-wrapper">
          <Avatar name={user.name} size="lg" />
        </div>

        <div className="profile-card__details">
          <h2 className="profile-card__name">{user.name}</h2>
          <p className="profile-card__email">{user.email}</p>

          <div className="profile-card__badges">
            <Badge variant={isAdmin ? 'info' : 'neutral'}>
              {isAdmin ? 'Admin' : 'Member'}
            </Badge>
            <UserStatusBadge status={user.status} />
          </div>
        </div>

        <div className="profile-card__meta">
          <div>
            <span>Account Role</span>
            <strong>{user.role}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{user.status}</strong>
          </div>
        </div>
      </div>
    </Card>
  );
};
