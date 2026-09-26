import React from 'react';
import './AuthCard.scss';

export interface AuthCardProps {
  title: string;
  subtitle?: string;
  brandName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  title,
  subtitle,
  brandName = 'SaaS Core',
  children,
  footer,
  className = '',
}) => {
  return (
    <div className={`auth-card ${className}`.trim()}>
      <div className="auth-card__brand">
        <span className="material-icon auth-card__brand-icon">bolt</span>
        <span>{brandName}</span>
      </div>

      <div className="auth-card__header">
        <h1 className="auth-card__title">{title}</h1>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
      </div>

      <div className="auth-card__body">
        {children}
      </div>

      {footer && (
        <div className="auth-card__footer">
          {footer}
        </div>
      )}
    </div>
  );
};
