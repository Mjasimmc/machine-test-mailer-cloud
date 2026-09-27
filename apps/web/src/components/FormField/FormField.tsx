import React, { memo } from 'react';
import './FormField.scss';

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = memo(({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-field ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

FormField.displayName = 'FormField';
