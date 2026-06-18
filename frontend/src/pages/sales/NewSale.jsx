import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Trash2, ShoppingCart, ArrowLeft, AlertTriangle, Package, CheckCircle2, Banknote, CreditCard, Smartphone } from 'lucide-react';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

const PAYMENT_OPTIONS = [
  { value: 'cash',     label: 'Cash',     icon: Banknote },
  { value: 'pos',      label: 'POS',      icon: CreditCard },
  { value: 'transfer', label: 'Transfer', icon: Smartphone },
];

export default function NewSale() {
  const [products, setProducts] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [inventory, setInventory] = useState({});
  const [items, setItems] = useState([{ productId: '', quantity: 1, sellingPrice: 0, productName: '' }]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [outletId, setOutletId] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    Promise.all([API.get('/products'), API.get('/outlets')]).then(([pRes, oRes]) => {
      setProducts(pRes.data);
      setOutlets(oRes.data);
      const oid = !isOwner && user?.outlet
        ? (user.outlet._id || user.outlet)
        : (oRes.data.length === 1 ? oRes.data[0]._id : '');
      if (oid) setOutletId(oid);

      const preId = searchParams.get('productId');
      if (preId) {
        const product = pRes.data.find(p => p._id === preId);
        if (product) {
          setItems([{ productId: product._id, quantity: 1, sellingPrice: product.sellingPrice, productName: product.name }]);
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!outletId) { setInventory({}); return; }
    API.get(`/inventory?outletId=${outletId}`).then(res => {
      const map = {};
      res.data.forEach(item => { if (item.product?._id) map[item.product._id] = item.quantity; });
      setInventory(map);
    }).catch(() => {});
  }, [outletId]);

  const getAvailable = (productId) => inventory[productId] ?? null;

  const selectProduct = (index, productId) => {
    const product = products.find(p => p._id === productId);
    setItems(it => it.map((item, i) => i === index
      ? { ...item, productId, sellingPrice: product?.sellingPrice || 0, productName: product?.name || '', quantity: 1 }
      : item));
  };

  const setQty = (index, val) => {
    const num = Math.max(1, parseInt(val) || 1);
    setItems(it => it.map((item, i) => i === index ? { ...item, quantity: num } : item));
  };

  const addItem = () => setItems(it => [...it, { productId: '', quantity: 1, sellingPrice: 0, productName: '' }]);
  const removeItem = (i) => setItems(it => it.filter((_, idx) => idx !== i));

  const total = items.reduce((s, item) => s + (Number(item.sellingPrice) * Number(item.quantity || 0)), 0);

  const stockErrors = items.map(item => {
    if (!item.productId) return null;
    const avail = getAvailable(item.productId);
    if (avail === null) return null;
    if (avail === 0) return 'Out of stock';
    if (Number(item.quantity) > avail) return `Only ${avail} available`;
    return null;
  });
  const hasStockError = stockErrors.some(e => e !== null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!outletId) return toast.error('Please select an outlet');
    if (items.some(i => !i.productId)) return toast.error('Select a product for each item');
    if (hasStockError) return toast.error('Fix stock issues before submitting');
    setLoading(true);
    try {
      await API.post('/sales', { outletId, items, paymentMethod, customerName, notes });
      toast.success('Sale submitted for approval!');
      navigate('/sales');
    } catch (err) { toast.error(err.response?.data?.message || 'Error submitting sale'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">New Sale</h2>
          {!isOwner && user?.outlet?.name && <p className="text-xs text-gray-400">{user.outlet.name}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Outlet selector — owner only */}
        {isOwner && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Outlet</label>
            <select required className="input" value={outletId} onChange={e => setOutletId(e.target.value)}>
              <option value="">— Select outlet —</option>
              {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Items</h3>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={13} /> Add Item
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {items.map((item, i) => {
              const product = products.find(p => p._id === item.productId);
              const avail = item.productId ? getAvailable(item.productId) : null;
              const err = stockErrors[i];
              return (
                <div key={i} className="px-4 py-3 space-y-3">
                  {/* Product selector */}
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      {product?.image
                        ? <img src={product.image} className="w-9 h-9 rounded-xl object-cover" alt="" />
                        : <Package size={16} className="text-blue-400" />}
                    </div>
                    <select required className="input text-sm flex-1"
                      value={item.productId} onChange={e => selectProduct(i, e.target.value)}>
                      <option value="">— Select product —</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)}
                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Quantity + Price + Subtotal */}
                  {item.productId && (
                    <div className="flex items-center gap-2">
                      {/* Qty stepper */}
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <button type="button"
                          onClick={() => setQty(i, item.quantity - 1)}
                          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg font-bold transition-colors">−</button>
                        <span className="w-10 text-center font-bold text-gray-800 text-base">{item.quantity}</span>
                        <button type="button"
                          onClick={() => setQty(i, item.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg font-bold transition-colors">+</button>
                      </div>

                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-0.5">Unit Price</p>
                        <input type="number" min="0" required className="input text-sm py-2"
                          value={item.sellingPrice} onChange={e => setItems(it => it.map((x,idx) => idx===i ? {...x, sellingPrice: e.target.value} : x))} />
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400 mb-0.5">Subtotal</p>
                        <p className="font-bold text-gray-800">{fmt(Number(item.sellingPrice) * item.quantity)}</p>
                      </div>
                    </div>
                  )}

                  {/* Stock status */}
                  {item.productId && avail !== null && (
                    err ? (
                      <div className="flex items-center gap-2 text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <AlertTriangle size={13} className="shrink-0" />
                        {err === 'Out of stock' ? 'This product is out of stock' : `Not enough stock — only ${avail} ${product?.unit || ''} available`}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                        <CheckCircle2 size={13} />
                        {avail} {product?.unit} in stock
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mx-4 mb-4 mt-1 bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">Total Amount</span>
            <span className="text-2xl font-bold text-blue-600">{fmt(total)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" onClick={() => setPaymentMethod(value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                  paymentMethod === value
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}>
                <Icon size={20} />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Customer & Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Customer Name <span className="normal-case font-normal text-gray-300">(optional)</span>
            </label>
            <input className="input" placeholder="e.g. John Doe" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Notes <span className="normal-case font-normal text-gray-300">(optional)</span>
            </label>
            <input className="input" placeholder="Any extra information" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading || hasStockError}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-md disabled:shadow-none">
          <ShoppingCart size={20} />
          {loading ? 'Recording...' : `Record Sale · ${fmt(total)}`}
        </button>

      </form>
    </div>
  );
}
