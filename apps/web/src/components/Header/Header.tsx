import React from 'react';
import './Header.scss';

export interface HeaderProps {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  actions,
  children,
  className = '',
}) => {
  return (
    <header className={`app-header ${className}`.trim()}>
      <div className="app-header__left">
        {title && (typeof title === 'string' ? <h1 className="app-header__title">{title}</h1> : title)}
      </div>

      <div className="app-header__right">
        {actions}
        {children}
      </div>
    </header>
  );
};
