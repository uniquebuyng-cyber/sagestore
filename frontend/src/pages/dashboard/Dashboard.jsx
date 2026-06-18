import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  TrendingUp, ShoppingCart, Receipt, Package, AlertTriangle,
  Clock, Banknote, Store, CheckCircle, XCircle, CalendarDays, Plus,
  PackagePlus, ChevronRight, Bell, BellOff,
} from 'lucide-react';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

function StatCard({ icon: Icon, label, value, sub, color = 'blue', link }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  const content = (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

function RejectModal({ saleId, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const handleReject = async () => {
    setLoading(true);
    try {
      await API.patch(`/sales/${saleId}/reject`, { reason });
      toast.success('Sale rejected — stock restored');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Reject Sale</h3>
        <p className="text-sm text-gray-400 mb-3">Stock will be restored to inventory.</p>
        <input className="input" placeholder="Reason (optional)" value={reason}
          onChange={e => setReason(e.target.value)} autoFocus />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleReject} disabled={loading} className="btn-danger flex-1">
            {loading ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkerDashboard({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get('/dashboard/worker').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const today = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-5">
      <div className="bg-blue-600 rounded-2xl p-5 text-white">
        <p className="text-blue-200 text-sm">{today}</p>
        <h2 className="text-2xl font-bold mt-1">Hi, {user?.name?.split(' ')[0]} 👋</h2>
        {user?.outlet?.name && <p className="text-blue-200 text-sm mt-1">{user.outlet.name}</p>}
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={16} className="text-blue-500" />
              <span className="text-xs text-gray-500 font-medium">Today's Sales</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.todayCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-yellow-500" />
              <span className="text-xs text-gray-500 font-medium">Pending</span>
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-xs text-gray-500 font-medium">This Month</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.monthCount}</p>
          </div>
          <div className={`rounded-xl border p-4 ${stats.rejectedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={16} className="text-red-500" />
              <span className="text-xs text-gray-500 font-medium">Rejected</span>
            </div>
            <p className={`text-3xl font-bold ${stats.rejectedCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.rejectedCount}</p>
          </div>
        </div>
      )}

      <Link to="/sales/new"
        className="flex items-center gap-4 p-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-colors shadow-md">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <Plus size={26} />
        </div>
        <div>
          <p className="font-bold text-lg">Record a Sale</p>
          <p className="text-blue-100 text-sm">Tap here to enter a new sale</p>
        </div>
      </Link>

      <Link to="/sales"
        className="flex items-center gap-4 p-4 bg-white border-2 border-gray-100 hover:border-blue-200 rounded-2xl transition-colors">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
          <ShoppingCart size={20} className="text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">My Sales</p>
          <p className="text-gray-400 text-sm">View your submitted sales</p>
        </div>
      </Link>

      {stats?.recentSales?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Sales</p>
          <div className="space-y-2">
            {stats.recentSales.map(s => (
              <div key={s._id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {s.items?.map(i => i.product?.name).filter(Boolean).join(', ') || 'Sale'}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(s.saleDate || s.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  s.status === 'approved' ? 'bg-green-100 text-green-700' :
                  s.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminMobileDashboard({ user, mobileData: data, onReload }) {
  const [profitView, setProfitView] = useState('today');
  const [rejectId, setRejectId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [notifGranted, setNotifGranted] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    Notification.requestPermission().then(p => setNotifGranted(p === 'granted'));
  }, []);

  useEffect(() => {
    if (!data || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (sessionStorage.getItem('sage_notif_fired')) return;
    sessionStorage.setItem('sage_notif_fired', '1');
    if (data.pendingCount > 0) {
      new Notification('Sage Store', {
        body: `${data.pendingCount} sale${data.pendingCount > 1 ? 's' : ''} need payment confirmation`,
        icon: '/icon-192.png',
        tag: 'pending-sales',
      });
    } else if (data.lowStock?.length > 0) {
      new Notification('Sage Store — Low Stock', {
        body: `${data.lowStock.length} product${data.lowStock.length > 1 ? 's' : ''} running low`,
        icon: '/icon-192.png',
        tag: 'low-stock',
      });
    }
  }, [data]);

  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      await API.patch(`/sales/${id}/approve`);
      toast.success('Payment confirmed!');
      onReload();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setApprovingId(null); }
  };

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return toast.error('Notifications not supported on this browser');
    const p = await Notification.requestPermission();
    setNotifGranted(p === 'granted');
    toast(p === 'granted' ? 'Notifications enabled!' : 'Permission denied', { icon: p === 'granted' ? '🔔' : '🔕' });
  };

  if (!data) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  const today = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4 pb-2">

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-blue-200 text-sm">{today}</p>
            <h2 className="text-2xl font-bold mt-0.5">Hi, {user?.name?.split(' ')[0]}</h2>
            <p className="text-blue-300 text-xs mt-0.5">{user?.role === 'owner' ? 'Store Owner' : 'Manager'}</p>
          </div>
          <button onClick={requestNotifications}
            title={notifGranted ? 'Notifications on' : 'Enable notifications'}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              notifGranted ? 'bg-white/15 hover:bg-white/25' : 'bg-amber-400/25 border border-amber-300/50 hover:bg-amber-400/40'}`}>
            {notifGranted
              ? <Bell size={18} className="text-white" />
              : <BellOff size={18} className="text-amber-300" />}
          </button>
        </div>

        {/* Today / Month toggle */}
        <div className="flex gap-1 bg-white/10 rounded-xl p-1">
          {[['today', 'Today'], ['month', 'This Month']].map(([v, l]) => (
            <button key={v} onClick={() => setProfitView(v)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                profitView === v ? 'bg-white text-blue-700 shadow-sm' : 'text-white/70 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Revenue + Profit figures */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide">Revenue</p>
            <p className="text-2xl font-bold mt-1">{profitView === 'today' ? fmt(data.today?.revenue) : fmt(data.monthly?.revenue)}</p>
            <p className="text-blue-300 text-xs mt-0.5">
              {profitView === 'today' ? `${data.today?.salesCount || 0} sales` : `${data.monthly?.salesCount || 0} sales`}
            </p>
          </div>
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide">
              {profitView === 'month' ? 'Net Profit' : 'Profit'}
            </p>
            <p className={`text-2xl font-bold mt-1 ${profitView === 'month' && data.monthly?.netProfit < 0 ? 'text-red-300' : ''}`}>
              {profitView === 'today' ? fmt(data.today?.profit) : fmt(data.monthly?.netProfit)}
            </p>
            {profitView === 'month' && (
              <p className="text-blue-300 text-xs mt-0.5">Expenses: {fmt(data.monthly?.expenses)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Pending payment banner */}
      {data.pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-900 text-sm">
              {data.pendingCount} pending payment{data.pendingCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-600">Confirm receipt of each payment below</p>
          </div>
        </div>
      )}

      {/* Pending Sales */}
      {data.pendingSales?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-0.5">Confirm Payments</p>
          <div className="space-y-2">
            {data.pendingSales.map(sale => (
              <div key={sale._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{sale.worker?.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{sale.outlet?.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {sale.items?.slice(0, 3).map((item, i) => (
                        <span key={i} className="text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {item.productName} ×{item.quantity}
                        </span>
                      ))}
                      {sale.items?.length > 3 && (
                        <span className="text-xs text-gray-400">+{sale.items.length - 3} more</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      <span className="font-semibold uppercase">{sale.paymentMethod}</span>
                      {' · '}
                      {new Date(sale.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900 text-base">{fmt(sale.totalAmount)}</p>
                    <p className="text-xs text-green-600 font-medium">{fmt(sale.totalProfit)} profit</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 border-t border-gray-100">
                  <button onClick={() => handleApprove(sale._id)} disabled={approvingId === sale._id}
                    className="flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 active:bg-green-200 transition-colors disabled:opacity-50">
                    <CheckCircle size={15} />
                    {approvingId === sale._id ? 'Confirming...' : 'Confirm'}
                  </button>
                  <button onClick={() => setRejectId(sale._id)}
                    className="flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 transition-colors border-l border-gray-100">
                    <XCircle size={15} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Alerts */}
      {data.lowStock?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-0.5">
            <AlertTriangle size={13} className="text-orange-500" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide flex-1">Low Stock Alert</p>
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{data.lowStock.length}</span>
          </div>
          <div className="space-y-2">
            {data.lowStock.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white border border-orange-100 rounded-xl px-4 py-3 shadow-sm">
                {item.product?.image
                  ? <img src={item.product.image} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />
                  : <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                      <Package size={18} className="text-orange-400" />
                    </div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.product?.name}</p>
                  <p className="text-xs text-gray-400">{item.outlet?.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xl font-bold ${item.quantity === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                    {item.quantity}
                  </p>
                  <p className="text-xs text-gray-400">left</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/inventory"
            className="mt-2 flex items-center justify-center gap-1 text-sm text-blue-600 font-medium py-2 hover:underline">
            Manage inventory <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Best Sellers per Outlet */}
      {data.bestSellersByOutlet?.filter(o => o.products.length > 0).length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-0.5">Best Sellers This Month</p>
          <div className="space-y-3">
            {data.bestSellersByOutlet.filter(o => o.products.length > 0).map(outlet => (
              <div key={outlet.outletId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <Store size={14} className="text-blue-500" />
                  <p className="text-sm font-semibold text-gray-700">{outlet.outletName}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {outlet.products.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-white bg-blue-500 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">{p.totalQty} units</p>
                        <p className="text-xs text-gray-400">{fmt(p.totalRevenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/inventory"
          className="bg-white border-2 border-gray-100 hover:border-blue-200 active:scale-95 rounded-xl p-4 flex flex-col items-center gap-2 transition-all">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <PackagePlus size={22} className="text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-gray-800">Add Stock</p>
          <p className="text-xs text-gray-400 text-center">Receive a delivery</p>
        </Link>
        <Link to="/sales?status=pending"
          className="bg-white border-2 border-gray-100 hover:border-amber-200 active:scale-95 rounded-xl p-4 flex flex-col items-center gap-2 transition-all">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
            <ShoppingCart size={22} className="text-amber-600" />
          </div>
          <p className="text-sm font-semibold text-gray-800">All Sales</p>
          <p className="text-xs text-gray-400 text-center">View full history</p>
        </Link>
      </div>

      {rejectId && (
        <RejectModal
          saleId={rejectId}
          onClose={() => setRejectId(null)}
          onDone={() => { setRejectId(null); onReload(); }}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [mobileData, setMobileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isOwner, isWorker, user } = useAuth();

  const load = useCallback(async () => {
    try {
      const [deskRes, mobileRes] = await Promise.all([
        API.get('/dashboard'),
        API.get('/dashboard/admin-mobile'),
      ]);
      setData(deskRes.data);
      setMobileData(mobileRes.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isWorker) { load(); } else { setLoading(false); }
  }, [load, isWorker]);

  if (isWorker) return <WorkerDashboard user={user} />;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );
  if (!data) return <p className="text-gray-500 text-center py-20">Could not load dashboard</p>;

  return (
    <>
      {/* Mobile admin — shown only on small screens */}
      <div className="lg:hidden">
        <AdminMobileDashboard user={user} mobileData={mobileData} onReload={load} />
      </div>

      {/* Desktop admin — hidden on mobile */}
      <div className="hidden lg:block space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Today stats */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Banknote} label="Today's Revenue" value={fmt(data.today.revenue)} sub={`${data.today.salesCount} sales`} color="blue" />
            <StatCard icon={TrendingUp} label="Today's Profit" value={fmt(data.today.profit)} color="green" />
            <StatCard icon={Clock} label="Pending Sales" value={data.pending.sales} sub="Require confirmation" color="yellow" link="/sales?status=pending" />
            <StatCard icon={Receipt} label="Pending Expenses" value={data.pending.expenses} sub="Require approval" color="red" link="/expenses?status=pending" />
          </div>
        </div>

        {/* Monthly stats */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">This Month</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Banknote} label="Monthly Revenue" value={fmt(data.monthly.revenue)} sub={`${data.monthly.salesCount} sales`} color="blue" />
            <StatCard icon={TrendingUp} label="Gross Profit" value={fmt(data.monthly.grossProfit)} color="green" />
            <StatCard icon={Receipt} label="Total Expenses" value={fmt(data.monthly.expenses)} color="yellow" />
            <StatCard icon={TrendingUp} label="Net Profit" value={fmt(data.monthly.netProfit)} color={data.monthly.netProfit >= 0 ? 'green' : 'red'} />
          </div>
        </div>

        {/* Stock */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Inventory</p>
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={Package} label="Total Stock Value" value={fmt(data.stockValue)} color="purple" />
            <StatCard icon={AlertTriangle} label="Low Stock Products" value={data.lowStockCount} sub="Need restocking" color="red" link="/inventory?lowStock=true" />
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Revenue — Last 7 Days</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.salesChart}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={l => `Date: ${l}`} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#colorRev)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Top Selling Products (This Month)</h3>
            {data.topProducts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-10">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v) => [`${v} units`, 'Quantity']} />
                  <Bar dataKey="totalQty" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Units Sold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Outlet performance */}
        {isOwner && data.outletPerformance.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Outlet Performance (This Month)</h3>
              <Link to="/outlets" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  <th className="table-header">Outlet</th>
                  <th className="table-header text-right">Revenue</th>
                  <th className="table-header text-right">Profit</th>
                  <th className="table-header text-right">Sales</th>
                </tr></thead>
                <tbody>
                  {data.outletPerformance.map((o, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="table-cell font-medium flex items-center gap-2"><Store size={14} className="text-gray-400" />{o.outletName || 'Unknown'}</td>
                      <td className="table-cell text-right">{fmt(o.revenue)}</td>
                      <td className="table-cell text-right text-green-600 font-medium">{fmt(o.profit)}</td>
                      <td className="table-cell text-right">{o.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Low stock alert */}
        {data.lowStockItems.length > 0 && (
          <div className="card border-orange-200 bg-orange-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-orange-500" />
              <h3 className="font-semibold text-orange-800">Low Stock Alert</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.lowStockItems.map((item, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-orange-200">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.product?.name}</p>
                  <p className="text-xs text-orange-600 font-semibold mt-1">{item.quantity} left</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
