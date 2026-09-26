import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './app/providers/AuthProvider';
import { SocketProvider } from './app/providers/SocketProvider';
import { AppRouter } from './app/router/AppRouter';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRouter />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
