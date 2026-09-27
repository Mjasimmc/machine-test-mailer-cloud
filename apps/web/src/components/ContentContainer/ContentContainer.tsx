import React from 'react';
import './ContentContainer.scss';

export interface ContentContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'narrow' | 'default' | 'wide' | 'full';
  children: React.ReactNode;
}

const ContentContainerComponent: React.FC<ContentContainerProps> = ({
  size = 'default',
  children,
  className = '',
  ...props
}) => {
  const classNames = [
    'content-container',
    size !== 'default' ? `content-container--${size}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
};

export const ContentContainer = React.memo(ContentContainerComponent);
ContentContainer.displayName = 'ContentContainer';

