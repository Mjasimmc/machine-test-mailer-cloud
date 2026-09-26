import React, { forwardRef } from 'react';
import './Input.scss';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  inputSize?: 'small' | 'medium' | 'large';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, inputSize = 'medium', className = '', ...props }, ref) => {
    const classNames = [
      'input-control',
      hasError ? 'input-control--error' : '',
      `input-control--${inputSize}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return <input ref={ref} className={classNames} {...props} />;
  }
);

Input.displayName = 'Input';
