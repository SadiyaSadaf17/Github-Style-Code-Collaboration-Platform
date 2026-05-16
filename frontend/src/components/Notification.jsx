import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bell, Check } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { subscribe } = useSocket();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get('http://localhost:5001/notification-api/notifications', {
          withCredentials: true
        });
        setNotifications(res.data.payload || res.data);
      } catch (err) {
        console.error("Error fetching notifications", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  useEffect(() => {
    const unsub = subscribe('notification:new', (data) => {
      if (data?.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
      }
    });
    return unsub;
  }, [subscribe]);

  const markAllRead = async () => {
    try {
      await axios.patch('http://localhost:5001/notification-api/notifications/read-all', {}, {
        withCredentials: true,
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.patch(`http://localhost:5001/notification-api/notifications/${id}/read`, {}, {
        withCredentials: true
      });
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error("Error marking as read", err);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading notifications...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Bell size={24} />
          Notifications
        </h1>
        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Mark all as read
          </button>
        )}
      </div>
      <div className="space-y-4">
        {notifications.map((notif) => (
          <div key={notif._id} className={`p-4 border rounded-md ${notif.read ? 'bg-gray-50' : 'bg-white border-blue-200'}`}>
            <p className="text-gray-800">{notif.message}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-500">{new Date(notif.createdAt).toLocaleString()}</span>
              {!notif.read && (
                <button
                  onClick={() => markAsRead(notif._id)}
                  className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-1"
                >
                  <Check size={14} />
                  Mark as read
                </button>
              )}
            </div>
          </div>
        ))}
        {notifications.length === 0 && <p className="text-gray-500">No notifications.</p>}
      </div>
    </div>
  );
}

export default Notification;