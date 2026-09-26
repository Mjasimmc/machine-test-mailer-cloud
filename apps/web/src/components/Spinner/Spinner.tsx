import React from 'react';
import './Spinner.scss';

export interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'medium',
  className = '',
}) => {
  return (
    <div
      className={`spinner spinner--${size} ${className}`.trim()}
      role="status"
      aria-label="Loading"
    />
  );
};
