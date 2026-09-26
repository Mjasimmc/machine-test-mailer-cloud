import React, { useEffect } from 'react';
import './Toast.scss';

export interface ToastProps {
  id?: string;
  message: React.ReactNode;
  variant?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  duration = 4000,
  onClose,
  className = '',
}) => {
  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`toast toast--${variant} ${className}`.trim()} role="alert">
      <div className="toast__message">{message}</div>
      {onClose && (
        <button
          type="button"
          className="toast__close"
          onClick={onClose}
          aria-label="Dismiss toast"
        >
          &times;
        </button>
      )}
    </div>
  );
};
