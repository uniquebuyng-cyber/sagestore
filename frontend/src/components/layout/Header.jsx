import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, ChevronDown, KeyRound, X, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import toast from 'react-hot-toast';

import { formatDistanceToNow } from 'date-fns';

function PinSetupModal({ onClose, onSaved, hasPin }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleSave = async () => {
    if (pin.length !== 4) return toast.error('PIN must be 4 digits');
    if (pin !== confirm) return toast.error('PINs do not match');
    setLoading(true);
    try {
      await API.put('/auth/set-pin', { pin });
      toast.success('PIN set! You can now log in with your PIN.');
      onSaved();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to set PIN'); }
    finally { setLoading(false); }
  };

  const handleRemove = async () => {
    if (!confirm('Remove your PIN? You will only be able to log in with password.')) return;
    setRemoving(true);
    try {
      await API.delete('/auth/remove-pin');
      toast.success('PIN removed');
      onSaved();
      onClose();
    } catch { toast.error('Failed to remove PIN'); }
    finally { setRemoving(false); }
  };

  const pinInput = (value, onChange, placeholder) => (
    <input
      type="tel"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={4}
      className="input text-center text-2xl tracking-[0.5em] font-bold"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
    />
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">{hasPin ? 'Change PIN' : 'Set Login PIN'}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">
            Set a 4-digit PIN so you can log in quickly on your phone without typing your full password.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              New PIN
            </label>
            {pinInput(pin, setPin, '● ● ● ●')}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Confirm PIN
            </label>
            {pinInput(confirm, setConfirm, '● ● ● ●')}
            {confirm.length === 4 && pin !== confirm && (
              <p className="text-xs text-red-500 mt-1">PINs do not match</p>
            )}
            {confirm.length === 4 && pin === confirm && (
              <p className="text-xs text-green-600 mt-1">PINs match</p>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={loading || pin.length !== 4 || confirm.length !== 4}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors">
            {loading ? 'Saving...' : hasPin ? 'Update PIN' : 'Save PIN'}
          </button>

          {hasPin && (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors">
              <Trash2 size={14} />
              {removing ? 'Removing...' : 'Remove PIN'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Header({ onMenuClick }) {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false);
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

  const handlePinSaved = () => refreshUser();

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 safe-top">
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
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
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
          <div className="relative" ref={userRef}>
            <button onClick={() => setShowUser(v => !v)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block font-medium text-gray-700">{user?.name?.split(' ')[0]}</span>
              <ChevronDown size={14} className="text-gray-500" />
            </button>

            {showUser && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  {user?.hasPin && (
                    <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      PIN active
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setShowUser(false); setShowPinModal(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <KeyRound size={15} className="text-blue-500" />
                  {user?.hasPin ? 'Change PIN' : 'Set Login PIN'}
                </button>
                <button
                  onClick={() => { logout(); navigate('/login'); setShowUser(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showPinModal && (
        <PinSetupModal
          hasPin={!!user?.hasPin}
          onClose={() => setShowPinModal(false)}
          onSaved={handlePinSaved}
        />
      )}
    </>
  );
}
