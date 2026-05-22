import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { getSocketAuthToken } from '../services/api.js';

const SocketContext = createContext(null);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return ctx;
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
    const connectSocket = () => {
      const token = getSocketAuthToken();
      return io(backendUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        auth: token ? { token } : {},
      });
    };

    const s = connectSocket();
    socketRef.current = s;

    const joinUserRoom = () => {
      try {
        const raw = localStorage.getItem('user');
        if (!raw) return;
        const u = JSON.parse(raw);
        const id = u?._id ?? u?.id;
        if (id) {
          s.emit('join-user', String(id));
        }
      } catch (_) {
        /* ignore */
      }
    };

    s.on('connect', () => {
      setConnected(true);
      joinUserRoom();
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    joinUserRoom();

    const onAuthOrStorage = () => {
      joinUserRoom();
      const token = getSocketAuthToken();
      if (token) {
        s.auth = { token };
        if (!s.connected) s.connect();
      }
    };
    window.addEventListener('app-auth-changed', onAuthOrStorage);
    window.addEventListener('storage', onAuthOrStorage);

    return () => {
      window.removeEventListener('app-auth-changed', onAuthOrStorage);
      window.removeEventListener('storage', onAuthOrStorage);
      s.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  const getSocket = useCallback(() => socketRef.current, []);

  /** Subscribe to a socket event; returns unsubscribe function. */
  const subscribe = useCallback((event, handler) => {
    const inst = socketRef.current;
    if (inst) {
      inst.on(event, handler);
    }
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  const joinRepo = useCallback((repoId) => {
    if (repoId == null) return;
    socketRef.current?.emit('join-repo', String(repoId));
  }, []);

  const leaveRepo = useCallback((repoId) => {
    if (repoId == null) return;
    socketRef.current?.emit('leave-repo', String(repoId));
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  /** Prefer subscribe(); legacy helpers */
  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  const value = useMemo(
    () => ({
      connected,
      getSocket,
      subscribe,
      joinRepo,
      leaveRepo,
      emit,
      on,
      off,
      socket: socketRef.current,
    }),
    [connected, getSocket, subscribe, joinRepo, leaveRepo, emit, on, off]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
