import React, { useCallback, useEffect, useState } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Boxes, AlertTriangle, Plus, X, Filter, PackagePlus, History, Package, ChevronLeft, ChevronRight } from 'lucide-react';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const todayISO = () => new Date().toISOString().split('T')[0];

const TYPE_LABELS = {
  stock_in:   { label: 'Stock In',   color: 'bg-green-100 text-green-700' },
  stock_out:  { label: 'Stock Out',  color: 'bg-red-100 text-red-700' },
  damaged:    { label: 'Damaged',    color: 'bg-orange-100 text-orange-700' },
  returned:   { label: 'Returned',   color: 'bg-blue-100 text-blue-700' },
  adjustment: { label: 'Adjustment', color: 'bg-purple-100 text-purple-700' },
  sale:       { label: 'Sale',       color: 'bg-gray-100 text-gray-600' },
};

function AdjustModal({ onClose, onSaved, outlets, products, preselect }) {
  const { isWorker, user } = useAuth();
  const [form, setForm] = useState({
    outletId:  preselect?.outletId  || (isWorker && user?.outlet?._id) || '',
    productId: preselect?.productId || '',
    type:     'stock_in',
    quantity:  '',
    date:      todayISO(),
    notes:     '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/inventory/adjust', form);
      toast.success('Stock updated');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Update Stock</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isWorker && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Outlet *</label>
              <select required className="input" value={form.outletId} onChange={e => setForm(f => ({ ...f, outletId: e.target.value }))}>
                <option value="">— Select outlet —</option>
                {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
            <select required className="input" value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">— Select product —</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select required className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="stock_in">Stock In (Purchase)</option>
                <option value="stock_out">Stock Out</option>
                <option value="damaged">Damaged</option>
                <option value="returned">Returned</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input required type="number" min="1" className="input" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
              {form.type === 'stock_in' && <span className="text-gray-400 font-normal"> — when was this stock received?</span>}
            </label>
            <input
              type="date"
              required
              className="input"
              value={form.date}
              max={todayISO()}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input className="input" placeholder="e.g. Delivered by supplier, invoice #123"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkerInventory({ inventory, onAdjust }) {
  const lowCount = inventory.filter(i => i.isLowStock).length;
  return (
    <div className="space-y-4">
      {lowCount > 0 && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700 font-medium">{lowCount} product{lowCount > 1 ? 's' : ''} running low on stock</p>
        </div>
      )}
      <div className="space-y-3">
        {inventory.map((item, i) => (
          <div key={i} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${item.isLowStock ? 'border-orange-200 bg-orange-50/40' : 'border-gray-100'}`}>
            {item.product?.image
              ? <img src={item.product.image} className="w-12 h-12 rounded-lg object-cover shrink-0" alt="" />
              : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0"><Boxes size={18} className="text-gray-400" /></div>}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{item.product?.name}</p>
              <p className="text-xs text-gray-500">{item.outlet?.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-bold text-blue-600">{fmt(item.product?.sellingPrice)}</span>
                <span className="text-xs text-gray-400">{item.product?.unit}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-gray-800">{item.quantity}</p>
              <p className="text-xs text-gray-400 mb-1">remaining</p>
              {item.isLowStock
                ? <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">Low</span>
                : <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">OK</span>}
            </div>
            <button onClick={() => onAdjust({ outletId: item.outlet?._id, productId: item.product?._id })}
              className="ml-1 p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg shrink-0" title="Update stock">
              <PackagePlus size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PurchaseHistory({ outlets }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [outletId, setOutletId] = useState('');
  const [typeFilter, setTypeFilter] = useState('stock_in');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalQty, setTotalQty] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (outletId) params.set('outletId', outletId);
      if (typeFilter) params.set('type', typeFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const { data } = await API.get(`/inventory/transactions?${params}`);
      setTransactions(data.transactions || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setTotalQty((data.transactions || []).reduce((s, t) => s + t.quantity, 0));
    } catch {} finally { setLoading(false); }
  }, [outletId, typeFilter, startDate, endDate, page]);

  useEffect(() => { setPage(1); }, [outletId, typeFilter, startDate, endDate]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Outlet</label>
          <select className="input" value={outletId} onChange={e => setOutletId(e.target.value)}>
            <option value="">All Outlets</option>
            {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="stock_in">Stock In (Purchases)</option>
            <option value="">All Types</option>
            <option value="stock_out">Stock Out</option>
            <option value="damaged">Damaged</option>
            <option value="returned">Returned</option>
            <option value="sale">Sales</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="date" className="input" value={endDate} max={todayISO()} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Summary row */}
      {!loading && transactions.length > 0 && (
        <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">Total Records</p>
            <p className="text-xl font-bold text-blue-700">{total}</p>
          </div>
          <div className="w-px h-8 bg-blue-200" />
          <div>
            <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">Total Quantity</p>
            <p className="text-xl font-bold text-blue-700">{totalQty.toLocaleString()} units</p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <History size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-400 text-sm">No records found for the selected filters</p>
        </div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Product</th>
                    <th className="table-header">Outlet</th>
                    <th className="table-header text-center">Qty</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Notes</th>
                    <th className="table-header">Entered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map(t => {
                    const meta = TYPE_LABELS[t.type] || { label: t.type, color: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={t._id} className="hover:bg-gray-50">
                        <td className="table-cell whitespace-nowrap font-medium text-gray-700">
                          {fmtDate(t.transactionDate || t.createdAt)}
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            {t.product?.image
                              ? <img src={t.product.image} className="w-7 h-7 rounded object-cover shrink-0" alt="" />
                              : <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center shrink-0"><Package size={12} className="text-gray-400" /></div>}
                            <div>
                              <p className="font-medium text-gray-800 whitespace-nowrap">{t.product?.name}</p>
                              {t.product?.brand && <p className="text-xs text-gray-400">{t.product.brand}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell text-gray-600 whitespace-nowrap">{t.outlet?.name || '—'}</td>
                        <td className="table-cell text-center font-bold text-gray-900">
                          {t.quantity} <span className="text-xs font-normal text-gray-400">{t.product?.unit}</span>
                        </td>
                        <td className="table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${meta.color}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="table-cell text-gray-500 text-xs">{t.notes || '—'}</td>
                        <td className="table-cell text-gray-500 text-xs whitespace-nowrap">{t.performedBy?.name || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">Page {page} of {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preselect, setPreselect] = useState(null);
  const [tab, setTab] = useState('stock'); // 'stock' | 'history'
  const { isWorker } = useAuth();

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedOutlet) params.set('outletId', selectedOutlet);
      if (lowStock) params.set('lowStock', 'true');
      const [invRes, outRes, prodRes] = await Promise.all([
        API.get(`/inventory?${params}`),
        API.get('/outlets'),
        API.get('/products'),
      ]);
      setInventory(invRes.data);
      setOutlets(outRes.data);
      setProducts(prodRes.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedOutlet, lowStock]);

  const openAdjust = (pre = null) => { setPreselect(pre); setShowModal(true); };

  const totalValue = inventory.reduce((s, i) => s + (i.stockValue || 0), 0);
  const lowCount = inventory.filter(i => i.isLowStock).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Inventory</h2>
        <button onClick={() => openAdjust()} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Stock
        </button>
      </div>

      {/* Tab switcher — only for admin/manager */}
      {!isWorker && (
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button onClick={() => setTab('stock')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'stock' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <Boxes size={14} /> Current Stock
          </button>
          <button onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <History size={14} /> Purchase History
          </button>
        </div>
      )}

      {/* Current Stock tab */}
      {tab === 'stock' && (
        <>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-gray-400" />
              <select className="input w-auto" value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)}>
                <option value="">All Outlets</option>
                {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} className="w-4 h-4 rounded" />
              Low stock only
            </label>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
          ) : inventory.length === 0 ? (
            <div className="card text-center py-16"><Boxes size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">No inventory records found</p></div>
          ) : isWorker ? (
            <WorkerInventory inventory={inventory} onAdjust={openAdjust} />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="card py-3"><p className="text-xs text-gray-500">Stock Value</p><p className="text-xl font-bold text-gray-900 mt-0.5">{fmt(totalValue)}</p></div>
                <div className="card py-3"><p className="text-xs text-gray-500">Total Items</p><p className="text-xl font-bold text-gray-900 mt-0.5">{inventory.length}</p></div>
                <div className="card py-3 border-orange-200 bg-orange-50"><p className="text-xs text-orange-600">Low Stock</p><p className="text-xl font-bold text-orange-700 mt-0.5">{lowCount}</p></div>
              </div>

              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="table-header">Product</th>
                        <th className="table-header">Outlet</th>
                        <th className="table-header text-right">Qty</th>
                        <th className="table-header text-right">Sell Price</th>
                        <th className="table-header text-right">Stock Value</th>
                        <th className="table-header">Status</th>
                        <th className="table-header"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {inventory.map((item, i) => (
                        <tr key={i} className={`hover:bg-gray-50 ${item.isLowStock ? 'bg-orange-50/50' : ''}`}>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              {item.product?.image
                                ? <img src={item.product.image} className="w-7 h-7 rounded object-cover" alt="" />
                                : <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center"><Boxes size={12} className="text-gray-400" /></div>}
                              <div>
                                <p className="font-medium text-gray-800">{item.product?.name}</p>
                                {item.product?.brand && <p className="text-xs text-gray-400">{item.product.brand}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="table-cell text-gray-600">{item.outlet?.name || '—'}</td>
                          <td className="table-cell text-right font-semibold">{item.quantity} <span className="text-gray-400 font-normal text-xs">{item.product?.unit}</span></td>
                          <td className="table-cell text-right text-blue-600 font-medium">{fmt(item.product?.sellingPrice)}</td>
                          <td className="table-cell text-right text-gray-600">{fmt(item.stockValue)}</td>
                          <td className="table-cell">
                            {item.isLowStock
                              ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium"><AlertTriangle size={10} /> Low Stock</span>
                              : <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">In Stock</span>}
                          </td>
                          <td className="table-cell">
                            <button onClick={() => openAdjust({ outletId: item.outlet?._id, productId: item.product?._id })}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Update stock">
                              <PackagePlus size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Purchase History tab */}
      {tab === 'history' && <PurchaseHistory outlets={outlets} />}

      {showModal && (
        <AdjustModal
          onClose={() => { setShowModal(false); setPreselect(null); }}
          onSaved={() => { setShowModal(false); setPreselect(null); load(); }}
          outlets={outlets}
          products={products}
          preselect={preselect}
        />
      )}
    </div>
  );
}
