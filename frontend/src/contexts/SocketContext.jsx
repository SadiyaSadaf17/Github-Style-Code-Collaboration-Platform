import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef();

  useEffect(() => {
    // Connect to Socket.io server
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
    socketRef.current = io(backendUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('Connected to server:', socketRef.current.id);
      
      // Join user room for notifications if user is logged in
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user._id) {
        socketRef.current.emit('join-user', user._id);
        console.log(`Joined user room: ${user._id}`);
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Socket methods
  const joinRepo = (repoId) => {
    if (socketRef.current) {
      socketRef.current.emit('join-repo', repoId);
    }
  };

  const leaveRepo = (repoId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-repo', repoId);
    }
  };

  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  const value = {
    socket: socketRef.current,
    joinRepo,
    leaveRepo,
    emit,
    on,
    off,
    isConnected: socketRef.current?.connected || false
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};