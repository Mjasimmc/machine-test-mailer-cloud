import React from 'react';
import './Card.scss';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`card__footer ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
