import React from 'react';
import './AuthLayout.scss';

export interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`auth-layout ${className}`.trim()}>
      {children}
    </div>
  );
};
