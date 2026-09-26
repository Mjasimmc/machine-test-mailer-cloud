import React from 'react';
import './Alert.scss';

export interface AlertProps {
  id?: string;
  variant?: 'error' | 'success' | 'info' | 'warning';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  id,
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  return (
    <div id={id} className={`alert alert--${variant} ${className}`.trim()} role="alert">
      <div className="alert__content">
        {title && <div className="alert__title">{title}</div>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          className="alert__close"
          onClick={onClose}
          aria-label="Dismiss alert"
        >
          &times;
        </button>
      )}
    </div>
  );
};
