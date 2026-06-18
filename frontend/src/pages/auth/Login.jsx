import React, { useState, useEffect } from 'react';
import { Droplets, Eye, EyeOff, Delete, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function Login() {
  const [mode, setMode] = useState('pin'); // 'pin' | 'password'
  const [savedEmail, setSavedEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  // Password mode state
  const [pwEmail, setPwEmail] = useState('');
  const [pwPassword, setPwPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    const e = localStorage.getItem('sage_pin_email');
    if (e) setSavedEmail(e);
  }, []);

  const activeEmail = savedEmail || emailInput;

  const doLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    window.location.href = '/dashboard';
  };

  const handleKeyPress = (digit) => {
    if (loading) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) submitPin(next);
  };

  const handleBackspace = () => setPin(p => p.slice(0, -1));

  const submitPin = async (enteredPin) => {
    if (!activeEmail) { toast.error('Enter your email first'); setPin(''); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/pin-login', { email: activeEmail, pin: enteredPin });
      localStorage.setItem('sage_pin_email', activeEmail);
      doLogin(data.token, data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect PIN');
      setPin('');
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email: pwEmail, password: pwPassword });
      doLogin(data.token, data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
      setLoading(false);
    }
  };

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-gray-900 flex flex-col items-center justify-center p-5">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl mb-4 shadow-xl">
          <Droplets size={38} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Sage Store</h1>
        <p className="text-blue-300 text-sm mt-1">Multi-Outlet Management System</p>
      </div>

      {mode === 'pin' ? (
        <div className="w-full max-w-xs">
          {/* Show saved name or email input */}
          {savedEmail ? (
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-white">{savedEmail.charAt(0).toUpperCase()}</span>
              </div>
              <p className="text-white font-medium text-sm truncate">{savedEmail}</p>
              <button onClick={() => { setSavedEmail(''); localStorage.removeItem('sage_pin_email'); setPin(''); }}
                className="text-blue-300 text-xs mt-1 hover:text-white underline">Not you? Change</button>
            </div>
          ) : (
            <div className="mb-5">
              <input
                type="email"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300 text-center focus:outline-none focus:border-blue-400"
                placeholder="Enter your email"
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setPin(''); }} />
            </div>
          )}

          {/* PIN dots */}
          <div className="flex justify-center gap-5 mb-8">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full transition-all duration-150 ${
                pin.length > i ? 'bg-white scale-110' : 'bg-white/30'}`} />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {keys.map((k, i) => {
              if (k === '') return <div key={i} />;
              if (k === '⌫') return (
                <button key={i} onClick={handleBackspace} disabled={loading}
                  className="h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all">
                  <Delete size={22} />
                </button>
              );
              return (
                <button key={i} onClick={() => handleKeyPress(k)}
                  disabled={loading || pin.length >= 4}
                  className="h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 transition-all text-2xl font-semibold text-white disabled:opacity-30">
                  {k}
                </button>
              );
            })}
          </div>

          {loading && (
            <div className="flex justify-center mt-6">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          <p className="text-center mt-8">
            <button onClick={() => setMode('password')} className="text-blue-300 text-xs hover:text-white">
              Admin? Use password instead
            </button>
          </p>
        </div>
      ) : (
        <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-6">
          <button onClick={() => setMode('pin')} className="flex items-center gap-1 text-gray-500 text-sm mb-4 hover:text-gray-700">
            <ChevronLeft size={16} /> Back to PIN
          </button>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Admin Login</h2>
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <input type="email" required className="input" placeholder="Email address"
              value={pwEmail} onChange={e => setPwEmail(e.target.value)} />
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} required className="input pr-10"
                placeholder="Password" value={pwPassword} onChange={e => setPwPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">
            <a href="/setup" className="text-blue-600 hover:underline">First time setup</a>
          </p>
        </div>
      )}
    </div>
  );
}
