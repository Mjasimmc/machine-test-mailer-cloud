import React from 'react';
import './FormMessage.scss';

export interface FormMessageProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'error' | 'hint';
  children: React.ReactNode;
}

export const FormMessage: React.FC<FormMessageProps> = ({
  variant = 'error',
  children,
  className = '',
  ...props
}) => {
  if (!children) return null;

  return (
    <span className={`form-message form-message--${variant} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
};
