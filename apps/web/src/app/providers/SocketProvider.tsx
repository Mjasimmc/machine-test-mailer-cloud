import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, UserStatus } from '@saas/shared';
import { useAuth } from './AuthProvider';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, handleSuspended } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const handleSuspendedRef = useRef(handleSuspended);
  handleSuspendedRef.current = handleSuspended;

  const userEmailRef = useRef(user?.email);
  userEmailRef.current = user?.email;

  const userId = user?.id;
  const userStatus = user?.status;

  useEffect(() => {
    if (!token || !userId || userStatus === UserStatus.SUSPENDED) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[Socket] Connected to real-time gateway for user ${userId}`);
    });

    // Handle immediate suspension event
    socket.on(SOCKET_EVENTS.USER_SUSPENDED, (data: any) => {
      console.warn(`[Socket] Received account suspension notification:`, data);
      socket.disconnect();
      socketRef.current = null;
      handleSuspendedRef.current(userEmailRef.current);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected:`, reason);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, userId, userStatus]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
