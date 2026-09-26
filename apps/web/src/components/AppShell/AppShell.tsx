import React from 'react';
import './AppShell.scss';

export interface AppShellProps {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  sidebar,
  header,
  children,
  className = '',
}) => {
  return (
    <div className={`app-shell ${!sidebar ? 'app-shell--no-sidebar' : ''} ${className}`.trim()}>
      {sidebar}
      <div className="app-shell__main">
        {header}
        <main className="app-shell__content">
          {children}
        </main>
      </div>
    </div>
  );
};
