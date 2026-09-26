import React, { forwardRef } from 'react';
import './Select.scss';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError = false, className = '', children, ...props }, ref) => {
    const classNames = [
      'select-control',
      hasError ? 'select-control--error' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <select ref={ref} className={classNames} {...props}>
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';
