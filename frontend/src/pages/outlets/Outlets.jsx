import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Store, MapPin, Users, Edit2, Trash2, X } from 'lucide-react';

function OutletModal({ outlet, onClose, onSaved, workers }) {
  const [form, setForm] = useState({ name: outlet?.name || '', address: outlet?.address || '', phone: outlet?.phone || '', managerId: outlet?.manager?._id || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (outlet) {
        await API.put(`/outlets/${outlet._id}`, form);
        toast.success('Outlet updated');
      } else {
        await API.post('/outlets', form);
        toast.success('Outlet created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving outlet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{outlet ? 'Edit Outlet' : 'New Outlet'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outlet Name *</label>
            <input required className="input" placeholder="e.g. Benin Branch" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <input required className="input" placeholder="Full address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input className="input" placeholder="+234..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
            <select className="input" value={form.managerId} onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}>
              <option value="">— Select manager —</option>
              {workers.filter(w => w.role === 'manager').map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
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

export default function Outlets() {
  const [outlets, setOutlets] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const { isOwner } = useAuth();

  const load = async () => {
    try {
      const [oRes, wRes] = await Promise.all([API.get('/outlets'), API.get('/workers')]);
      setOutlets(oRes.data);
      setWorkers(wRes.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this outlet?')) return;
    try {
      await API.delete(`/outlets/${id}`);
      toast.success('Outlet deactivated');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Outlets</h2>
        {isOwner && (
          <button onClick={() => setModal({})} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Outlet
          </button>
        )}
      </div>

      {outlets.length === 0 ? (
        <div className="card text-center py-16">
          <Store size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No outlets yet. Create your first branch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {outlets.map(outlet => (
            <div key={outlet._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Store size={20} className="text-blue-600" />
                </div>
                {isOwner && (
                  <div className="flex gap-1">
                    <button onClick={() => setModal(outlet)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(outlet._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
              <Link to={`/outlets/${outlet._id}`}>
                <h3 className="font-semibold text-gray-900 hover:text-blue-600">{outlet.name}</h3>
                <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                  <MapPin size={13} /><span className="truncate">{outlet.address}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                  <Users size={13} /><span>{outlet.workerCount || 0} workers</span>
                </div>
                {outlet.manager && <p className="text-xs text-gray-400 mt-2">Manager: {outlet.manager.name}</p>}
              </Link>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <OutletModal outlet={modal._id ? modal : null} workers={workers} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}
