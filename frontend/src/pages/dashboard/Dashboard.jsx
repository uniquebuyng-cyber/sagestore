import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp, ShoppingCart, Receipt, Package, AlertTriangle,
  Clock, Banknote, BarChart2, Store, CheckCircle, XCircle, CalendarDays, Plus
} from 'lucide-react';

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

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

function WorkerDashboard({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get('/dashboard/worker').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const today = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="bg-blue-600 rounded-2xl p-5 text-white">
        <p className="text-blue-200 text-sm">{today}</p>
        <h2 className="text-2xl font-bold mt-1">Hi, {user?.name?.split(' ')[0]} 👋</h2>
        {user?.outlet?.name && <p className="text-blue-200 text-sm mt-1">{user.outlet.name}</p>}
      </div>

      {/* Stats */}
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

      {/* Action buttons */}
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

      {/* Recent sales */}
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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isOwner, isWorker, user } = useAuth();

  useEffect(() => {
    if (!isWorker) {
      API.get('/dashboard').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (isWorker) return <WorkerDashboard user={user} />;

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  if (!data) return <p className="text-gray-500 text-center py-20">Could not load dashboard</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Today stats */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Today</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Banknote} label="Today's Revenue" value={fmt(data.today.revenue)} sub={`${data.today.salesCount} sales`} color="blue" />
          <StatCard icon={TrendingUp} label="Today's Profit" value={fmt(data.today.profit)} color="green" />
          <StatCard icon={Clock} label="Pending Sales" value={data.pending.sales} sub="Require approval" color="yellow" link="/sales?status=pending" />
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
        {/* Sales chart */}
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

        {/* Top products */}
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
  );
}
