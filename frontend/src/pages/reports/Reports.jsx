import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, BarChart3, TrendingUp, Receipt, Boxes } from 'lucide-react';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [salesData, setSalesData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [expenseData, setExpenseData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', outletId: '' });
  const { isOwner } = useAuth();

  useEffect(() => {
    API.get('/outlets').then(r => setOutlets(r.data)).catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.outletId) params.set('outletId', filters.outletId);
    try {
      const [sRes, pRes, eRes, iRes] = await Promise.all([
        API.get(`/reports/sales?${params}`),
        API.get(`/reports/profit?${params}`),
        API.get(`/reports/expenses?${params}`),
        API.get(`/reports/inventory?${params}`),
      ]);
      setSalesData(sRes.data);
      setProfitData(pRes.data);
      setExpenseData(eRes.data);
      setInventoryData(iRes.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [filters]);

  const exportSales = (format) => {
    const params = new URLSearchParams({ format });
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.outletId) params.set('outletId', filters.outletId);
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || '/api';
    const url = `${base}/reports/export/sales?${params}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const tabs = [
    { id: 'sales', label: 'Sales', icon: BarChart3 },
    { id: 'profit', label: 'Profit', icon: TrendingUp },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <div className="flex gap-2">
          <button onClick={() => exportSales('excel')} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Download size={14} /> Excel
          </button>
          <button onClick={() => exportSales('pdf')} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="date" className="input w-auto" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
        <input type="date" className="input w-auto" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
        {isOwner && (
          <select className="input w-auto" value={filters.outletId} onChange={e => setFilters(f => ({ ...f, outletId: e.target.value }))}>
            <option value="">All Outlets</option>
            {outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="space-y-6">
          {/* Sales Tab */}
          {tab === 'sales' && salesData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card"><p className="text-xs text-gray-500">Revenue</p><p className="text-2xl font-bold text-gray-900 mt-1">{fmt(salesData.totals?.revenue)}</p></div>
                <div className="card"><p className="text-xs text-gray-500">Cost</p><p className="text-2xl font-bold text-gray-900 mt-1">{fmt(salesData.totals?.cost)}</p></div>
                <div className="card"><p className="text-xs text-gray-500">Gross Profit</p><p className="text-2xl font-bold text-green-600 mt-1">{fmt(salesData.totals?.profit)}</p></div>
                <div className="card"><p className="text-xs text-gray-500">Total Sales</p><p className="text-2xl font-bold text-blue-600 mt-1">{salesData.totals?.count}</p></div>
              </div>
              {salesData.data?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Revenue Over Time</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={salesData.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="_id.date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => fmt(v)} />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4,4,0,0]} />
                      <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {/* Profit Tab */}
          {tab === 'profit' && profitData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="card"><p className="text-xs text-gray-500">Revenue</p><p className="text-2xl font-bold mt-1">{fmt(profitData.revenue)}</p></div>
                <div className="card"><p className="text-xs text-gray-500">Gross Profit</p><p className="text-2xl font-bold text-green-600 mt-1">{fmt(profitData.grossProfit)}</p></div>
                <div className="card"><p className="text-xs text-gray-500">Total Expenses</p><p className="text-2xl font-bold text-red-500 mt-1">{fmt(profitData.totalExpenses)}</p></div>
                <div className={`card sm:col-span-3 ${profitData.netProfit >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <p className="text-xs font-medium">{profitData.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</p>
                  <p className={`text-3xl font-bold mt-1 ${profitData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(profitData.netProfit)}</p>
                </div>
              </div>
              {profitData.productProfit?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Profit by Product (Top 10)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b"><th className="table-header">Product</th><th className="table-header text-right">Revenue</th><th className="table-header text-right">Profit</th><th className="table-header text-right">Units</th></tr></thead>
                      <tbody>{profitData.productProfit.map((p, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="table-cell font-medium">{p.name}</td>
                          <td className="table-cell text-right">{fmt(p.revenue)}</td>
                          <td className="table-cell text-right text-green-600 font-medium">{fmt(p.profit)}</td>
                          <td className="table-cell text-right">{p.qty}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Expenses Tab */}
          {tab === 'expenses' && expenseData && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="card"><p className="text-xs text-gray-500">Total Expenses</p><p className="text-2xl font-bold text-red-500 mt-1">{fmt(expenseData.totals?.total)}</p></div>
                <div className="card"><p className="text-xs text-gray-500">Total Count</p><p className="text-2xl font-bold mt-1">{expenseData.totals?.count}</p></div>
              </div>
              {expenseData.byCategory?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">By Category</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={expenseData.byCategory} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={80} label={({ _id, percent }) => `${_id?.replace('_', ' ')} ${(percent*100).toFixed(0)}%`}>
                        {expenseData.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {/* Inventory Tab */}
          {tab === 'inventory' && inventoryData && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="card"><p className="text-xs text-gray-500">Total Value</p><p className="text-2xl font-bold mt-1">{fmt(inventoryData.totalValue)}</p></div>
                <div className="card"><p className="text-xs text-gray-500">Total Items</p><p className="text-2xl font-bold mt-1">{inventoryData.totalItems}</p></div>
                <div className="card border-orange-200 bg-orange-50"><p className="text-xs text-orange-600">Low Stock</p><p className="text-2xl font-bold text-orange-700 mt-1">{inventoryData.lowStockCount}</p></div>
              </div>
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b"><tr>
                      <th className="table-header">Product</th><th className="table-header">Outlet</th><th className="table-header">Brand</th>
                      <th className="table-header text-right">Qty</th><th className="table-header text-right">Value</th><th className="table-header">Status</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {inventoryData.inventory?.map((item, i) => (
                        <tr key={i} className={`hover:bg-gray-50 ${item.isLowStock ? 'bg-orange-50/50' : ''}`}>
                          <td className="table-cell font-medium">{item.product}</td>
                          <td className="table-cell text-gray-500">{item.outlet}</td>
                          <td className="table-cell text-gray-500">{item.brand || '—'}</td>
                          <td className="table-cell text-right">{item.quantity}</td>
                          <td className="table-cell text-right">{fmt(item.stockValue)}</td>
                          <td className="table-cell">{item.isLowStock ? <span className="text-xs text-orange-600 font-medium">Low Stock</span> : <span className="text-xs text-green-600">OK</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
