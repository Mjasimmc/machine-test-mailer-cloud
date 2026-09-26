import React from 'react';
import './Badge.scss';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  size?: 'small' | 'medium';
  pill?: boolean;
  withDot?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'medium',
  pill = true,
  withDot = false,
  children,
  className = '',
  ...props
}) => {
  const classNames = [
    'badge',
    `badge--${variant}`,
    `badge--${size}`,
    pill ? 'badge--pill' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} {...props}>
      {withDot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
};
