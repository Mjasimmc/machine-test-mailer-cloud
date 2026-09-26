import React from 'react';
import './Skeleton.scss';

export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  width,
  height,
  className = '',
  style = {},
}) => {
  const inlineStyles: React.CSSProperties = {
    width,
    height,
    ...style,
  };

  return (
    <div
      className={`skeleton skeleton--${variant} ${className}`.trim()}
      style={inlineStyles}
      aria-hidden="true"
    />
  );
};
