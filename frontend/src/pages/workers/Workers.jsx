import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Users, Edit2, Trash2, X, Key, UserCheck, UserX } from 'lucide-react';

function WorkerModal({ worker, outlets, onClose, onSaved }) {
  const isNew = !worker?._id;
  const [form, setForm] = useState({
    name: worker?.name || '', email: worker?.email || '', phone: worker?.phone || '',
    role: worker?.role || 'worker', outletId: worker?.outlet?._id || worker?.outlet || '',
    password: '', isActive: worker?.isActive !== false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isNew) {
        await API.post('/auth/register', { ...form, outletId: form.outletId || undefined });
        toast.success('Worker account created');
      } else {
        await API.put(`/workers/${worker._id}`, { ...form, outletId: form.outletId || undefined });
        toast.success('Worker updated');
      }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{isNew ? 'Add Worker' : 'Edit Worker'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label><input required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input required type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select required className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="worker">Worker</option><option value="manager">Manager</option>
              </select>
            </div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Outlet</label>
              <select className="input" value={form.outletId} onChange={e => setForm(f => ({ ...f, outletId: e.target.value }))}>
                <option value="">— No outlet assigned —</option>
                {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
              </select>
            </div>
            {isNew && <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Password *</label><input required type="password" minLength={6} className="input" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>}
            {!isNew && (
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="active" className="text-sm text-gray-700">Account active</label>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ workerId, onClose }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (password.length < 6) return toast.error('Min 6 characters');
    setLoading(true);
    try { await API.patch(`/workers/${workerId}/reset-password`, { newPassword: password }); toast.success('Password reset'); onClose(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold mb-3">Reset Password</h3>
        <input type="password" className="input" placeholder="New password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} />
        <div className="flex gap-3 mt-4"><button onClick={onClose} className="btn-secondary flex-1">Cancel</button><button onClick={handle} disabled={loading} className="btn-primary flex-1">{loading ? '...' : 'Reset'}</button></div>
      </div>
    </div>
  );
}

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [filterOutlet, setFilterOutlet] = useState('');
  const { isOwner } = useAuth();

  const load = async () => {
    try {
      const [wRes, oRes] = await Promise.all([
        API.get(`/workers${filterOutlet ? `?outletId=${filterOutlet}` : ''}`),
        API.get('/outlets'),
      ]);
      setWorkers(wRes.data);
      setOutlets(oRes.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterOutlet]);

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this worker?')) return;
    try { await API.delete(`/workers/${id}`); toast.success('Worker deactivated'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Workers</h2>
        {isOwner && <button onClick={() => setModal({})} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Worker</button>}
      </div>

      <div className="flex gap-3">
        <select className="input w-auto" value={filterOutlet} onChange={e => setFilterOutlet(e.target.value)}>
          <option value="">All Outlets</option>
          {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : workers.length === 0 ? (
        <div className="card text-center py-16"><Users size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">No workers found</p></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Role</th>
                <th className="table-header">Outlet</th>
                <th className="table-header">Status</th>
                {isOwner && <th className="table-header">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workers.map(w => (
                <tr key={w._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{w.name.charAt(0)}</div>
                      <div><p className="font-medium text-gray-800">{w.name}</p><p className="text-xs text-gray-400">{w.email}</p></div>
                    </div>
                  </td>
                  <td className="table-cell"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{w.role}</span></td>
                  <td className="table-cell text-gray-600">{w.outlet?.name || '—'}</td>
                  <td className="table-cell">
                    {w.isActive ? <span className="badge-approved">Active</span> : <span className="badge-rejected">Inactive</span>}
                  </td>
                  {isOwner && (
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal(w)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit2 size={14} /></button>
                        <button onClick={() => setResetId(w._id)} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Reset password"><Key size={14} /></button>
                        {w.isActive && <button onClick={() => handleDeactivate(w._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Deactivate"><UserX size={14} /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && <WorkerModal worker={modal._id ? modal : null} outlets={outlets} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {resetId && <ResetPasswordModal workerId={resetId} onClose={() => { setResetId(null); }} />}
    </div>
  );
}
