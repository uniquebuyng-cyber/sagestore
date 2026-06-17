import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function NewSale() {
  const [products, setProducts] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [items, setItems] = useState([{ productId: '', quantity: 1, sellingPrice: 0, productName: '' }]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [outletId, setOutletId] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isOwner } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([API.get('/products'), API.get('/outlets')]).then(([pRes, oRes]) => {
      setProducts(pRes.data);
      setOutlets(oRes.data);
      if (!isOwner && user?.outlet) setOutletId(user.outlet._id || user.outlet);
      else if (oRes.data.length === 1) setOutletId(oRes.data[0]._id);
    }).catch(() => {});
  }, []);

  const selectProduct = (index, productId) => {
    const product = products.find(p => p._id === productId);
    setItems(it => it.map((item, i) => i === index ? { ...item, productId, sellingPrice: product?.sellingPrice || 0, productName: product?.name || '' } : item));
  };

  const updateItem = (index, field, value) => {
    setItems(it => it.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems(it => [...it, { productId: '', quantity: 1, sellingPrice: 0, productName: '' }]);
  const removeItem = (i) => setItems(it => it.filter((_, idx) => idx !== i));

  const total = items.reduce((s, item) => s + (Number(item.sellingPrice) * Number(item.quantity || 0)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!outletId) return toast.error('Please select an outlet');
    if (items.some(i => !i.productId)) return toast.error('Select a product for each item');
    setLoading(true);
    try {
      await API.post('/sales', { outletId, items, paymentMethod, customerName, notes });
      toast.success('Sale submitted for approval');
      navigate('/sales');
    } catch (err) { toast.error(err.response?.data?.message || 'Error submitting sale'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/sales')} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></button>
        <h2 className="text-xl font-bold text-gray-900">New Sale</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Outlet */}
        {isOwner && (
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">Outlet *</label>
            <select required className="input" value={outletId} onChange={e => setOutletId(e.target.value)}>
              <option value="">— Select outlet —</option>
              {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          </div>
        )}

        {/* Items */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Items</h3>
            <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"><Plus size={14} /> Add Item</button>
          </div>
          {items.map((item, i) => {
            const product = products.find(p => p._id === item.productId);
            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5">
                  <select required className="input text-sm" value={item.productId} onChange={e => selectProduct(i, e.target.value)}>
                    <option value="">— Product —</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <input type="number" min="1" required className="input text-sm" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                </div>
                <div className="col-span-3">
                  <input type="number" min="0" required className="input text-sm" placeholder="Price" value={item.sellingPrice} onChange={e => updateItem(i, 'sellingPrice', e.target.value)} />
                </div>
                <div className="col-span-1 flex items-center justify-center pt-2">
                  {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>}
                </div>
                <div className="col-span-1 pt-2 text-right">
                  <p className="text-xs text-gray-500 font-medium">{fmt(Number(item.sellingPrice) * Number(item.quantity || 0))}</p>
                </div>
              </div>
            );
          })}
          <div className="pt-3 border-t border-gray-100 flex justify-between">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold text-green-600">{fmt(total)}</span>
          </div>
        </div>

        {/* Payment & Customer */}
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
            <div className="grid grid-cols-3 gap-2">
              {['cash', 'pos', 'transfer'].map(m => (
                <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                  className={`py-2.5 rounded-lg text-sm font-medium capitalize border transition-colors ${paymentMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name <span className="text-gray-400">(Optional)</span></label>
            <input className="input" placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400">(Optional)</span></label>
            <input className="input" placeholder="Any notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          <ShoppingCart size={18} />
          {loading ? 'Submitting...' : 'Submit Sale for Approval'}
        </button>
      </form>
    </div>
  );
}
