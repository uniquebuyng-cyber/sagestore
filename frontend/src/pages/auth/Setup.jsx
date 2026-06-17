import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { Droplets } from 'lucide-react';

export default function Setup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await API.post('/auth/setup', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Owner account created! Welcome.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Droplets size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Initial Setup</h1>
          <p className="text-blue-200 text-sm mt-1">Create your owner account</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-5">Create Owner Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
              { key: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com' },
              { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+234...' },
              { key: 'password', label: 'Password', type: 'password', placeholder: 'At least 6 characters' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input type={field.type} required={field.key !== 'phone'} placeholder={field.placeholder} className="input"
                  value={form[field.key]} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))} />
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? 'Creating...' : 'Create Account & Continue'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">Already set up? <a href="/login" className="text-blue-600 hover:underline">Sign in</a></p>
        </div>
      </div>
    </div>
  );
}
