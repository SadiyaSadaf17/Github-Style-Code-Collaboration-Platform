import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';
import { useSocket } from '../contexts/SocketContext.jsx';

const fetchNotifications = async () => {
  const res = await api.get('/notification-api/notifications');
  return res.data.payload || res.data;
};

export default function useNotifications() {
  const queryClient = useQueryClient();
  const { subscribe } = useSocket();

  const q = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: true,
  });

  // subscribe to socket and update cache on new notifications
  const setupSocket = useCallback(() => {
    if (!subscribe) return () => {};
    const handler = (data) => {
      if (!data?.notification) return;
      queryClient.setQueryData(['notifications'], (old = []) => [data.notification, ...old]);
    };
    const unsub = subscribe('notification:new', handler);
    return unsub;
  }, [queryClient, subscribe]);

  // We can't call hooks conditionally here; components using this hook should
  // call `useEffect(() => setupSocket(), [setupSocket])` to activate the socket
  // subscription if they want it. To keep components simple, we provide helpers.

  const markAllRead = useCallback(async () => {
    await api.patch('/notification-api/notifications/read-all', {});
    queryClient.setQueryData(['notifications'], (old = []) => old.map((n) => ({ ...n, read: true })));
  }, [queryClient]);

  const markAsRead = useCallback(
    async (id) => {
      await api.patch(`/notification-api/notifications/${id}/read`, {});
      queryClient.setQueryData(['notifications'], (old = []) => old.map((n) => (n._id === id ? { ...n, read: true } : n)));
    },
    [queryClient]
  );

  return {
    ...q,
    setupSocket,
    markAllRead,
    markAsRead,
    refetch: q.refetch,
  };
}
