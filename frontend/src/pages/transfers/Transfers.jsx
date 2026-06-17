import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeftRight, Plus, CheckCircle, XCircle, X, Trash2 } from 'lucide-react';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
const statusBadge = (s) => s === 'completed' ? <span className="badge-approved">Completed</span> : s === 'rejected' ? <span className="badge-rejected">Rejected</span> : <span className="badge-pending">Pending</span>;

function TransferModal({ outlets, products, onClose, onSaved }) {
  const [form, setForm] = useState({ fromOutletId: '', toOutletId: '', notes: '' });
  const [items, setItems] = useState([{ productId: '', quantity: 1 }]);
  const [loading, setLoading] = useState(false);

  const addItem = () => setItems(i => [...i, { productId: '', quantity: 1 }]);
  const removeItem = (i) => setItems(it => it.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(it => it.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.fromOutletId === form.toOutletId) return toast.error('Source and destination must differ');
    if (items.some(i => !i.productId)) return toast.error('Select product for each item');
    setLoading(true);
    try {
      await API.post('/transfers', { ...form, items });
      toast.success('Transfer request submitted');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">New Stock Transfer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Outlet *</label>
              <select required className="input" value={form.fromOutletId} onChange={e => setForm(f => ({ ...f, fromOutletId: e.target.value }))}>
                <option value="">— Select —</option>
                {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Outlet *</label>
              <select required className="input" value={form.toOutletId} onChange={e => setForm(f => ({ ...f, toOutletId: e.target.value }))}>
                <option value="">— Select —</option>
                {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Products to Transfer</label>
              <button type="button" onClick={addItem} className="text-sm text-blue-600 flex items-center gap-1"><Plus size={13} /> Add Item</button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select required className="input flex-1" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)}>
                  <option value="">— Product —</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                <input type="number" min="1" required className="input w-20" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={15} /></button>}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input className="input" placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Submitting...' : 'Request Transfer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState('');
  const { isOwner } = useAuth();

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const [tRes, oRes, pRes] = await Promise.all([API.get(`/transfers?${params}`), API.get('/outlets'), API.get('/products')]);
      setTransfers(tRes.data.transfers || []);
      setOutlets(oRes.data);
      setProducts(pRes.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const handleApprove = async (id) => {
    try { await API.patch(`/transfers/${id}/approve`); toast.success('Transfer approved & completed'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;
    try { await API.patch(`/transfers/${id}/reject`, { reason }); toast.success('Transfer rejected'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Stock Transfers</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> New Transfer</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[{ v: '', l: 'All' }, { v: 'pending', l: 'Pending' }, { v: 'completed', l: 'Completed' }, { v: 'rejected', l: 'Rejected' }].map(({ v, l }) => (
          <button key={v} onClick={() => setStatus(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${status === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : transfers.length === 0 ? (
        <div className="card text-center py-16"><ArrowLeftRight size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">No transfers found</p></div>
      ) : (
        <div className="space-y-3">
          {transfers.map(t => (
            <div key={t._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    {statusBadge(t.status)}
                    <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="text-sm font-medium text-gray-700 bg-blue-50 px-3 py-1 rounded-lg">{t.fromOutlet?.name}</div>
                    <ArrowLeftRight size={14} className="text-gray-400 shrink-0" />
                    <div className="text-sm font-medium text-gray-700 bg-green-50 px-3 py-1 rounded-lg">{t.toOutlet?.name}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.items?.map((item, i) => (
                      <span key={i} className="text-xs bg-gray-50 border border-gray-100 px-2 py-0.5 rounded text-gray-600">{item.productName} × {item.quantity}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">by {t.requestedBy?.name}</p>
                  {t.notes && <p className="text-xs text-gray-500 mt-1">Note: {t.notes}</p>}
                </div>
                {isOwner && t.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApprove(t._id)} className="btn-success flex items-center gap-1 text-xs py-1.5 px-3"><CheckCircle size={13} /> Approve</button>
                    <button onClick={() => handleReject(t._id)} className="btn-danger flex items-center gap-1 text-xs py-1.5 px-3"><XCircle size={13} /> Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <TransferModal outlets={outlets} products={products} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
