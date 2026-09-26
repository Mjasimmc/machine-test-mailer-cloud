import React from 'react';
import './ErrorState.scss';
import { Button } from '../Button/Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this section.',
  onRetry,
  retryLabel = 'Try again',
  className = '',
}) => {
  return (
    <div className={`error-state ${className}`.trim()}>
      <div className="error-state__icon">
        <span className="material-icon" style={{ fontSize: '32px' }}>error_outline</span>
      </div>
      <h3 className="error-state__title">{title}</h3>
      {message && <p className="error-state__message">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="small" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
