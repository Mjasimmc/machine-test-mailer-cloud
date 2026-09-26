import React from 'react';
import './StatCard.scss';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  isLoading?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  description,
  trend,
  isLoading = false,
  className = '',
}) => {
  return (
    <div className={`stat-card ${className}`.trim()}>
      <div className="stat-card__top">
        <h4 className="stat-card__title">{title}</h4>
        {icon && (
          <div className="stat-card__icon">
            {typeof icon === 'string' ? <span className="material-icon">{icon}</span> : icon}
          </div>
        )}
      </div>

      <div className="stat-card__value">
        {isLoading ? '...' : value}
      </div>

      {(description || trend) && (
        <div className="stat-card__footer">
          {trend && (
            <span
              className={`stat-card__trend stat-card__trend--${
                trend.isPositive ? 'positive' : 'negative'
              }`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}
            >
              <span className="material-icon" style={{ fontSize: '14px' }}>
                {trend.isPositive ? 'trending_up' : 'trending_down'}
              </span>
              <span>{trend.value}</span>
            </span>
          )}
          {description && <span>{description}</span>}
        </div>
      )}
    </div>
  );
};
