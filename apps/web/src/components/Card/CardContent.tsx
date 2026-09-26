import React from 'react';
import './Card.scss';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card__content ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
