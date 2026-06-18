import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Droplets, Eye, EyeOff, Delete } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('password'); // 'password' | 'pin'
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinEmail, setPinEmail] = useState('');
  const [pin, setPin] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Remember last email used for PIN mode
  useEffect(() => {
    const saved = localStorage.getItem('sage_pin_email');
    if (saved) setPinEmail(saved);
  }, []);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (enteredPin) => {
    if (!pinEmail) { toast.error('Enter your email first'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/pin-login', { email: pinEmail, pin: enteredPin });
      localStorage.setItem('token', data.token);
      localStorage.setItem('sage_pin_email', pinEmail);
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (digit) => {
    if (loading) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      handlePinLogin(next);
    }
  };

  const handleBackspace = () => setPin(p => p.slice(0, -1));

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Droplets size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sage Store</h1>
          <p className="text-blue-200 text-sm mt-1">Multi-Outlet Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setMode('password')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'password' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
              Password
            </button>
            <button
              onClick={() => { setMode('pin'); setPin(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'pin' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
              PIN
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email" required className="input" placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'} required className="input pr-10"
                    placeholder="••••••••" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Email</label>
                <input
                  type="email" className="input" placeholder="you@example.com"
                  value={pinEmail}
                  onChange={e => { setPinEmail(e.target.value); setPin(''); }} />
              </div>

              {/* PIN dots */}
              <div className="flex justify-center gap-4 py-2">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`w-5 h-5 rounded-full border-2 transition-colors ${
                    pin.length > i ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`} />
                ))}
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3">
                {keys.map((k, i) => {
                  if (k === '') return <div key={i} />;
                  if (k === '⌫') return (
                    <button key={i} onClick={handleBackspace} disabled={loading}
                      className="h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-transform text-lg font-medium">
                      <Delete size={20} />
                    </button>
                  );
                  return (
                    <button key={i} onClick={() => handleKeyPress(k)} disabled={loading || pin.length >= 4}
                      className="h-14 rounded-xl bg-gray-100 hover:bg-blue-50 active:bg-blue-100 active:scale-95 transition-all text-xl font-semibold text-gray-800 disabled:opacity-40">
                      {k}
                    </button>
                  );
                })}
              </div>

              {loading && <p className="text-center text-sm text-blue-600">Checking PIN...</p>}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            First time?{' '}
            <a href="/setup" className="text-blue-600 hover:underline font-medium">Set up owner account</a>
          </p>
        </div>
      </div>
    </div>
  );
}
