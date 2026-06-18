import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, XCircle, Clock, ShoppingCart, X, Filter } from 'lucide-react';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

const statusBadge = (status) => {
  if (status === 'approved') return <span className="badge-approved">Approved</span>;
  if (status === 'rejected') return <span className="badge-rejected">Rejected</span>;
  return <span className="badge-pending">Pending</span>;
};

function RejectModal({ saleId, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const handleReject = async () => {
    setLoading(true);
    try {
      await API.patch(`/sales/${saleId}/reject`, { reason });
      toast.success('Sale rejected');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Reject Sale</h3>
        <input className="input" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleReject} disabled={loading} className="btn-danger flex-1">{loading ? 'Rejecting...' : 'Reject'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [outletId, setOutletId] = useState('');
  const [outlets, setOutlets] = useState([]);
  const [rejectId, setRejectId] = useState(null);
  const [searchParams] = useSearchParams();
  const { canApprove, isWorker } = useAuth();

  useEffect(() => {
    setStatus(searchParams.get('status') || '');
  }, [searchParams]);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (outletId) params.set('outletId', outletId);
      const [sRes, oRes] = await Promise.all([API.get(`/sales?${params}`), API.get('/outlets')]);
      setSales(sRes.data.sales || []);
      setOutlets(oRes.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status, outletId]);

  const handleApprove = async (id) => {
    try {
      await API.patch(`/sales/${id}/approve`);
      toast.success('Payment confirmed');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const counts = { pending: sales.filter(s => s.status === 'pending').length };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">Sales</h2>
          {counts.pending > 0 && <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">{counts.pending} pending</span>}
        </div>
        <Link to="/sales/new" className="btn-primary flex items-center gap-2"><Plus size={16} /> New Sale</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
          {[{ v: '', l: 'All' }, { v: 'pending', l: 'Pending' }, { v: 'approved', l: 'Approved' }, { v: 'rejected', l: 'Rejected' }].map(({ v, l }) => (
            <button key={v} onClick={() => setStatus(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${status === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>
              {l}
            </button>
          ))}
        </div>
        {!isWorker && (
          <select className="input w-auto" value={outletId} onChange={e => setOutletId(e.target.value)}>
            <option value="">All Outlets</option>
            {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : sales.length === 0 ? (
        <div className="card text-center py-16"><ShoppingCart size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">No sales found</p></div>
      ) : (
        <div className="space-y-3">
          {sales.map(sale => (
            <div key={sale._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    {statusBadge(sale.status)}
                    <span className="text-xs text-gray-400">{new Date(sale.saleDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{sale.paymentMethod?.toUpperCase()}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Outlet</p>
                      <p className="text-sm font-medium text-gray-700">{sale.outlet?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Worker</p>
                      <p className="text-sm text-gray-600">{sale.worker?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Items</p>
                      <p className="text-sm text-gray-600">{sale.items?.length} product(s)</p>
                    </div>
                    {sale.customerName && <div><p className="text-xs text-gray-400">Customer</p><p className="text-sm text-gray-600">{sale.customerName}</p></div>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {sale.items?.slice(0, 3).map((item, i) => (
                      <span key={i} className="text-xs bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.productName} x{item.quantity}</span>
                    ))}
                    {sale.items?.length > 3 && <span className="text-xs text-gray-400">+{sale.items.length - 3} more</span>}
                  </div>
                  {sale.rejectedReason && <p className="text-xs text-red-500 mt-1">Reason: {sale.rejectedReason}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-gray-900">{fmt(sale.totalAmount)}</p>
                  {canApprove && <p className="text-sm text-green-600 font-medium">Profit: {fmt(sale.totalProfit)}</p>}
                  {canApprove && sale.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleApprove(sale._id)} className="btn-success flex items-center gap-1 text-xs py-1.5 px-3"><CheckCircle size={13} /> Confirm Payment</button>
                      <button onClick={() => setRejectId(sale._id)} className="btn-danger flex items-center gap-1 text-xs py-1.5 px-3"><XCircle size={13} /> Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectId && <RejectModal saleId={rejectId} onClose={() => setRejectId(null)} onDone={() => { setRejectId(null); load(); }} />}
    </div>
  );
}
