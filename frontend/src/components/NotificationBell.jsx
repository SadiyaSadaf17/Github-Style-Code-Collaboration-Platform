import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../store/authStore';
import useNotifications from '../hooks/useNotifications';

function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { data: items = [], setupSocket, refetch } = useNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = setupSocket();
    return unsub;
  }, [setupSocket]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // ensure we have fresh notifications when user becomes authenticated
    refetch();
  }, [isAuthenticated, refetch]);

  if (!isAuthenticated) return null;

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) refetch();
        }}
        className="relative p-1 hover:text-blue-400 rounded-md"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-[#cf222e] text-white rounded-full border-2 border-[#24292f]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white text-gray-900 border border-gray-200 rounded-md shadow-xl z-50">
            <div className="px-3 py-2 border-b font-semibold text-sm flex justify-between items-center">
              <span>Notifications</span>
              {unread > 0 && <span className="text-xs text-gray-500">{unread} unread</span>}
            </div>
            {items.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No notifications yet.</p>
            ) : (
              <ul className="divide-y">
                {items.slice(0, 12).map((n) => (
                  <li
                    key={n._id}
                    className={`px-3 py-2 text-sm ${n.read ? 'bg-gray-50' : 'bg-blue-50/50'}`}>
                    <p className="font-medium text-gray-900 line-clamp-1">{n.title || n.type}</p>
                    <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-sm text-[#0969da] py-2 border-t hover:bg-gray-50"
            >
              See all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;
