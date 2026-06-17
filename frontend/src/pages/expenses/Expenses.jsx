import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Receipt, CheckCircle, XCircle, X } from 'lucide-react';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
const CATEGORIES = ['transportation', 'generator_fuel', 'repairs', 'maintenance', 'miscellaneous', 'rent', 'utilities', 'supplies'];
const statusBadge = (s) => s === 'approved' ? <span className="badge-approved">Approved</span> : s === 'rejected' ? <span className="badge-rejected">Rejected</span> : <span className="badge-pending">Pending</span>;

function ExpenseModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ category: 'transportation', amount: '', description: '' });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/expenses', form);
      toast.success('Expense submitted for approval');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Submit Expense</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select required className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦) *</label>
            <input required type="number" min="0" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea required rows={3} className="input resize-none" placeholder="Describe the expense..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RejectModal({ expenseId, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try { await API.patch(`/expenses/${expenseId}/reject`, { reason }); toast.success('Rejected'); onDone(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold mb-3">Reject Expense</h3>
        <input className="input" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex gap-3 mt-4"><button onClick={onClose} className="btn-secondary flex-1">Cancel</button><button onClick={handle} disabled={loading} className="btn-danger flex-1">{loading ? '...' : 'Reject'}</button></div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const { canApprove } = useAuth();

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const { data } = await API.get(`/expenses?${params}`);
      setExpenses(data.expenses || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const handleApprove = async (id) => {
    try { await API.patch(`/expenses/${id}/approve`); toast.success('Expense approved'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const totalPending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0);
  const totalApproved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Submit Expense</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card border-yellow-200 bg-yellow-50"><p className="text-xs text-yellow-700 font-medium">Pending Amount</p><p className="text-2xl font-bold text-yellow-800 mt-1">{fmt(totalPending)}</p></div>
        <div className="card border-green-200 bg-green-50"><p className="text-xs text-green-700 font-medium">Approved This Period</p><p className="text-2xl font-bold text-green-800 mt-1">{fmt(totalApproved)}</p></div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[{ v: '', l: 'All' }, { v: 'pending', l: 'Pending' }, { v: 'approved', l: 'Approved' }, { v: 'rejected', l: 'Rejected' }].map(({ v, l }) => (
          <button key={v} onClick={() => setStatus(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${status === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : expenses.length === 0 ? (
        <div className="card text-center py-16"><Receipt size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">No expenses found</p></div>
      ) : (
        <div className="space-y-3">
          {expenses.map(exp => (
            <div key={exp._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    {statusBadge(exp.status)}
                    <span className="text-sm font-medium text-gray-700 capitalize">{exp.category.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">{new Date(exp.expenseDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{exp.description}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>{exp.outlet?.name}</span>
                    <span>by {exp.worker?.name}</span>
                  </div>
                  {exp.rejectedReason && <p className="text-xs text-red-500 mt-1">Reason: {exp.rejectedReason}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-gray-900">{fmt(exp.amount)}</p>
                  {canApprove && exp.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleApprove(exp._id)} className="btn-success flex items-center gap-1 text-xs py-1.5 px-3"><CheckCircle size={13} /> Approve</button>
                      <button onClick={() => setRejectId(exp._id)} className="btn-danger flex items-center gap-1 text-xs py-1.5 px-3"><XCircle size={13} /> Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <ExpenseModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
      {rejectId && <RejectModal expenseId={rejectId} onClose={() => setRejectId(null)} onDone={() => { setRejectId(null); load(); }} />}
    </div>
  );
}
