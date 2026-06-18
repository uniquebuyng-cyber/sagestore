import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Package, Search, Edit2, Trash2, X, Image } from 'lucide-react';

const CATEGORIES = [
  { value: 'engine_oil', label: 'Engine Oil' },
  { value: 'gas_accessories', label: 'Gas Accessories' },
  { value: 'auto_accessories', label: 'Auto Accessories' },
];

const BRANDS = {
  engine_oil: ['Total', 'Mobil', 'Oando', 'AP', 'Castrol', 'Shell', 'Valvoline'],
  gas_accessories: ['Generic', 'Sumec', 'Mastar', 'QFP'],
  auto_accessories: ['Generic', 'Champion', 'Bosch', 'NGK'],
};

const catLabel = (c) => CATEGORIES.find(x => x.value === c)?.label || c;
const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

function ProductModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: product?.name || '', category: product?.category || 'engine_oil', brand: product?.brand || '',
    sku: product?.sku || '', costPrice: product?.costPrice || '', sellingPrice: product?.sellingPrice || '',
    lowStockLevel: product?.lowStockLevel || 5, description: product?.description || '', unit: product?.unit || 'piece',
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append('image', image);
      if (product) { await API.put(`/products/${product._id}`, fd); toast.success('Product updated'); }
      else { await API.post('/products', fd); toast.success('Product created'); }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving product'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{product ? 'Edit Product' : 'Add Product'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
              <input required className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select required className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, brand: '' }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <select className="input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}>
                <option value="">— Select brand —</option>
                {(BRANDS[form.category] || []).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input className="input" placeholder="Optional" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {['piece', 'litre', 'bottle', 'set', 'pair', 'pack'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₦) *</label>
              <input required type="number" min="0" className="input" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₦) *</label>
              <input required type="number" min="0" className="input" value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
              <input type="number" min="0" className="input" value={form.lowStockLevel} onChange={e => setForm(f => ({ ...f, lowStockLevel: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
              <input type="file" accept="image/*" className="input" onChange={e => setImage(e.target.files[0])} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [modal, setModal] = useState(null);
  const { canApprove, isOwner, isWorker } = useAuth();

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const { data } = await API.get(`/products?${params}`);
      setProducts(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, category]);

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this product?')) return;
    try { await API.delete(`/products/${id}`); toast.success('Product deactivated'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Products</h2>
        {canApprove && <button onClick={() => setModal({})} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Product</button>}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : products.length === 0 ? (
        <div className="card text-center py-16"><Package size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">No products found</p></div>
      ) : isWorker ? (
        /* Worker view — clean simple list, no prices hidden */
        <div className="space-y-2">
          {products.map(p => (
            <div key={p._id} className="bg-white border border-gray-100 rounded-xl flex items-center gap-3 p-3 shadow-sm">
              {p.image
                ? <img src={p.image} alt={p.name} className="w-14 h-14 object-cover rounded-lg shrink-0" />
                : <div className="w-14 h-14 bg-blue-50 rounded-lg flex items-center justify-center shrink-0"><Package size={22} className="text-blue-400" /></div>}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {[p.brand, catLabel(p.category)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400 mb-0.5">Selling Price</p>
                <p className="font-bold text-blue-600 text-base">{fmt(p.sellingPrice)}</p>
                <p className="text-xs text-gray-400 mt-0.5">per {p.unit}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Owner / Manager view — full cards with cost, margin, SKU */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p._id} className="card hover:shadow-md transition-shadow">
              {p.image ? (
                <img src={p.image} alt={p.name} className="w-full h-36 object-cover rounded-lg mb-3" />
              ) : (
                <div className="w-full h-36 bg-gray-100 rounded-lg mb-3 flex items-center justify-center"><Image size={32} className="text-gray-300" /></div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.brand && `${p.brand} — `}{catLabel(p.category)}</p>
                </div>
                {canApprove && (
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => setModal(p)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                    {isOwner && <button onClick={() => handleDelete(p._id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>}
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-gray-400">Cost</p><p className="font-medium text-gray-700">{fmt(p.costPrice)}</p></div>
                <div><p className="text-gray-400">Price</p><p className="font-semibold text-green-600">{fmt(p.sellingPrice)}</p></div>
                <div><p className="text-gray-400">Margin</p><p className="font-medium text-blue-600">{((p.sellingPrice - p.costPrice) / p.sellingPrice * 100).toFixed(0)}%</p></div>
                <div><p className="text-gray-400">Low Stock</p><p className="font-medium text-orange-500">≤{p.lowStockLevel}</p></div>
              </div>
              {p.sku && <p className="text-xs text-gray-400 mt-2">SKU: {p.sku}</p>}
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <ProductModal product={modal._id ? modal : null} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}
