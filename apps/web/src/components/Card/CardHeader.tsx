import React from 'react';
import './Card.scss';

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  description,
  action,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card__header ${className}`.trim()} {...props}>
      {(title || description) ? (
        <div>
          {title && (typeof title === 'string' ? <h3 className="card__title">{title}</h3> : title)}
          {description && (typeof description === 'string' ? <p className="card__description">{description}</p> : description)}
          {children}
        </div>
      ) : (
        children
      )}
      {action && <div className="card__header-action">{action}</div>}
    </div>
  );
};
