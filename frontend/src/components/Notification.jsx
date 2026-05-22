import React, { useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import useNotifications from '../hooks/useNotifications';

function Notification() {
  const { data: notifications = [], isLoading, setupSocket, markAllRead, markAsRead } = useNotifications();

  useEffect(() => {
    const unsub = setupSocket();
    return unsub;
  }, [setupSocket]);

  if (isLoading) return <div className="p-10 text-center">Loading notifications...</div>;

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