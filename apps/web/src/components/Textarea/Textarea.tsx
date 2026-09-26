import React, { forwardRef } from 'react';
import './Textarea.scss';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError = false, className = '', ...props }, ref) => {
    const classNames = [
      'textarea-control',
      hasError ? 'textarea-control--error' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return <textarea ref={ref} className={classNames} {...props} />;
  }
);

Textarea.displayName = 'Textarea';
