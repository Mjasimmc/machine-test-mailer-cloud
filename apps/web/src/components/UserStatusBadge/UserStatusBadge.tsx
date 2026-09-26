import React from 'react';
import { UserStatus } from '@saas/shared';
import { Badge } from '../Badge/Badge';

export interface UserStatusBadgeProps {
  status: UserStatus | string;
  className?: string;
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  const isSuspended = status === UserStatus.SUSPENDED || status === 'SUSPENDED';

  return (
    <Badge
      variant={isSuspended ? 'danger' : 'success'}
      withDot
      className={className}
    >
      {isSuspended ? 'Suspended' : 'Active'}
    </Badge>
  );
};
