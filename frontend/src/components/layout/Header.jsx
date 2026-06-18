import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, ChevronDown, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await API.get('/notifications');
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
    } catch {}
  };

  const markRead = async (id) => {
    await API.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications(n => n.map(x => x._id === id ? { ...x, isRead: true } : x));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await API.patch('/notifications/read-all').catch(() => {});
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    setUnread(0);
  };

  const savePin = async () => {
    if (!/^\d{4}$/.test(pinInput)) { toast.error('PIN must be exactly 4 digits'); return; }
    setPinLoading(true);
    try {
      await API.put('/auth/set-pin', { pin: pinInput });
      toast.success('PIN set! You can now log in with your PIN.');
      setShowPinModal(false);
      setPinInput('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set PIN');
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-gray-800 hidden sm:block">Sage Store</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="font-semibold text-sm">Notifications</p>
                {unread > 0 && <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-6">No notifications</p>
                ) : notifications.slice(0, 20).map(n => (
                  <div key={n._id} onClick={() => markRead(n._id)} className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50' : ''}`}>
                    <p className="text-sm font-medium text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button onClick={() => setShowUser(v => !v)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block font-medium text-gray-700">{user?.name?.split(' ')[0]}</span>
            <ChevronDown size={14} className="text-gray-500" />
          </button>

          {showUser && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button onClick={() => { setShowPinModal(true); setShowUser(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <KeyRound size={14} /> Set PIN Login
              </button>
              <button onClick={() => { logout(); navigate('/login'); setShowUser(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* PIN setup modal */}
    {showPinModal && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
          <h3 className="text-lg font-semibold mb-1">Set Your PIN</h3>
          <p className="text-sm text-gray-500 mb-5">Choose a 4-digit PIN to log in quickly on your phone.</p>
          <input
            type="password" inputMode="numeric" maxLength={4}
            className="input text-center text-2xl tracking-[0.5em] mb-4"
            placeholder="••••" value={pinInput}
            onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <div className="flex gap-3">
            <button onClick={() => { setShowPinModal(false); setPinInput(''); }}
              className="btn-secondary flex-1">Cancel</button>
            <button onClick={savePin} disabled={pinLoading || pinInput.length !== 4}
              className="btn-primary flex-1">{pinLoading ? 'Saving...' : 'Save PIN'}</button>
          </div>
        </div>
      </div>
    )}
  );
}
