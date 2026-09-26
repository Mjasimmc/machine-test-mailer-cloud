import React from 'react';
import './FormLabel.scss';

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export const FormLabel: React.FC<FormLabelProps> = ({
  required = false,
  children,
  className = '',
  ...props
}) => {
  return (
    <label className={`form-label ${className}`.trim()} {...props}>
      {children}
      {required && <span className="form-label__required" aria-hidden="true">*</span>}
    </label>
  );
};
