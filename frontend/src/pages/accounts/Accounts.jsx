import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark, Banknote, Smartphone, Wallet, Plus, ArrowLeftRight,
  ArrowDownCircle, ArrowUpCircle, X, ChevronRight, RefreshCw,
  TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Pencil, Trash2,
  Zap, ToggleLeft, ToggleRight,
} from 'lucide-react';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const fmt = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const today = () => new Date().toISOString().split('T')[0];

const TYPE_ICONS = {
  bank: Landmark,
  cash: Banknote,
  mobile_money: Smartphone,
  other: Wallet,
};

const TYPE_LABELS = {
  bank: 'Bank Account',
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  other: 'Other',
};

const TX_COLORS = {
  deposit: 'text-green-600 bg-green-50',
  withdrawal: 'text-red-600 bg-red-50',
  transfer_in: 'text-blue-600 bg-blue-50',
  transfer_out: 'text-orange-600 bg-orange-50',
};

const TX_LABELS = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
};

/* ─── Add / Edit Account Modal ─── */
function AccountModal({ account, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: account?.name || '',
    type: account?.type || 'bank',
    accountNumber: account?.accountNumber || '',
    openingBalance: '',
  });
  const [loading, setLoading] = useState(false);
  const isEdit = !!account;

  const save = async () => {
    if (!form.name.trim()) return toast.error('Account name is required');
    setLoading(true);
    try {
      if (isEdit) {
        await API.put(`/accounts/${account._id}`, { name: form.name, type: form.type, accountNumber: form.accountNumber });
        toast.success('Account updated');
      } else {
        await API.post('/accounts', form);
        toast.success('Account created');
      }
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{isEdit ? 'Edit Account' : 'Add New Account'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account Name *</label>
            <input className="input" placeholder="e.g. GTBank, Cash on Hand" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account Type</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="bank">Bank Account</option>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money (OPay, PalmPay...)</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account Number (optional)</label>
            <input className="input" placeholder="Last 4 digits or full number" value={form.accountNumber}
              onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Opening Balance (optional)</label>
              <input className="input" type="number" min="0" placeholder="0.00" value={form.openingBalance}
                onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Current amount already in this account</p>
            </div>
          )}
          <button onClick={save} disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Deposit Modal ─── */
function DepositModal({ accounts, preAccount, onClose, onSaved }) {
  const [form, setForm] = useState({
    accountId: preAccount?._id || (accounts[0]?._id || ''),
    amount: '',
    description: '',
    reference: '',
    date: today(),
  });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!form.accountId) return toast.error('Select an account');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    setLoading(true);
    try {
      await API.post('/accounts/deposit', form);
      toast.success('Deposit recorded');
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-green-600">
            <ArrowDownCircle size={18} />
            <h3 className="font-semibold text-gray-900">Record Deposit</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account</label>
            <select className="input" value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.name} — {fmt(a.balance)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (₦) *</label>
            <input className="input" type="number" min="1" placeholder="0.00" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
            <input className="input" placeholder="e.g. Cash from sales, Bank deposit" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
              <input className="input" type="date" max={today()} value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Reference (optional)</label>
              <input className="input" placeholder="Receipt no." value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
          </div>
          <button onClick={save} disabled={loading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
            {loading ? 'Saving...' : 'Record Deposit'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Withdraw Modal ─── */
function WithdrawModal({ accounts, preAccount, onClose, onSaved }) {
  const [form, setForm] = useState({
    accountId: preAccount?._id || (accounts[0]?._id || ''),
    amount: '',
    description: '',
    reference: '',
    date: today(),
  });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!form.accountId) return toast.error('Select an account');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    setLoading(true);
    try {
      await API.post('/accounts/withdraw', form);
      toast.success('Withdrawal recorded');
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-red-600">
            <ArrowUpCircle size={18} />
            <h3 className="font-semibold text-gray-900">Record Withdrawal</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account</label>
            <select className="input" value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.name} — {fmt(a.balance)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (₦) *</label>
            <input className="input" type="number" min="1" placeholder="0.00" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
            <input className="input" placeholder="e.g. Stock purchase, Salary, Expense" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
              <input className="input" type="date" max={today()} value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Reference (optional)</label>
              <input className="input" placeholder="Receipt no." value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
          </div>
          <button onClick={save} disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
            {loading ? 'Saving...' : 'Record Withdrawal'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Transfer Modal ─── */
function TransferModal({ accounts, onClose, onSaved }) {
  const [form, setForm] = useState({
    fromAccountId: accounts[0]?._id || '',
    toAccountId: accounts[1]?._id || '',
    amount: '',
    description: '',
    reference: '',
    date: today(),
  });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!form.fromAccountId || !form.toAccountId) return toast.error('Select both accounts');
    if (form.fromAccountId === form.toAccountId) return toast.error('Cannot transfer to same account');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    setLoading(true);
    try {
      await API.post('/accounts/transfer', form);
      toast.success('Transfer successful');
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-blue-600">
            <ArrowLeftRight size={18} />
            <h3 className="font-semibold text-gray-900">Transfer Funds</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From</label>
              <select className="input text-sm" value={form.fromAccountId}
                onChange={e => setForm(f => ({ ...f, fromAccountId: e.target.value }))}>
                {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To</label>
              <select className="input text-sm" value={form.toAccountId}
                onChange={e => setForm(f => ({ ...f, toAccountId: e.target.value }))}>
                {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          {form.fromAccountId && form.fromAccountId !== form.toAccountId && (
            <p className="text-xs text-gray-500">
              Available in {accounts.find(a => a._id === form.fromAccountId)?.name}:{' '}
              <strong>{fmt(accounts.find(a => a._id === form.fromAccountId)?.balance)}</strong>
            </p>
          )}
          {form.fromAccountId === form.toAccountId && (
            <p className="text-xs text-red-500">From and To cannot be the same account</p>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (₦) *</label>
            <input className="input" type="number" min="1" placeholder="0.00" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description (optional)</label>
            <input className="input" placeholder="Reason for transfer" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
              <input className="input" type="date" max={today()} value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Reference</label>
              <input className="input" placeholder="Optional" value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
          </div>
          <button onClick={save} disabled={loading || form.fromAccountId === form.toAccountId}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
            {loading ? 'Transferring...' : 'Transfer Funds'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Accounts Page ─── */
export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [routing, setRouting] = useState({ enabled: false, revenueAccountId: '', profitAccountId: '' });
  const [routingSaving, setRoutingSaving] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txPages, setTxPages] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  // Filters for Transactions tab
  const [txFilter, setTxFilter] = useState({ accountId: '', type: '', startDate: '', endDate: '' });

  // Modals
  const [modal, setModal] = useState(null);
  const [editAccount, setEditAccount] = useState(null);
  const [preAccount, setPreAccount] = useState(null);

  const loadAccounts = useCallback(async () => {
    try {
      const { data } = await API.get('/accounts');
      setAccounts(data);
    } catch { toast.error('Failed to load accounts'); }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await API.get(`/accounts/summary?period=${period}`);
      setSummary(data);
    } catch {}
  }, [period]);

  const loadRouting = useCallback(async () => {
    try {
      const { data } = await API.get('/settings');
      setRouting({
        enabled: data.autoRouting?.enabled || false,
        revenueAccountId: data.autoRouting?.revenueAccountId || '',
        profitAccountId: data.autoRouting?.profitAccountId || '',
      });
    } catch {}
  }, []);

  const saveRouting = async () => {
    setRoutingSaving(true);
    try {
      await API.put('/settings', { autoRouting: routing });
      toast.success(routing.enabled ? 'Auto-routing enabled' : 'Auto-routing saved');
    } catch { toast.error('Failed to save settings'); }
    finally { setRoutingSaving(false); }
  };

  const loadRecentTx = useCallback(async () => {
    try {
      const { data } = await API.get('/accounts/transactions?page=1&limit=8');
      setRecentTx(data.transactions || []);
    } catch {}
  }, []);

  const loadTransactions = useCallback(async (page = 1) => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (txFilter.accountId) params.append('accountId', txFilter.accountId);
      if (txFilter.type) params.append('type', txFilter.type);
      if (txFilter.startDate) params.append('startDate', txFilter.startDate);
      if (txFilter.endDate) params.append('endDate', txFilter.endDate);
      const { data } = await API.get(`/accounts/transactions?${params}`);
      setTransactions(data.transactions);
      setTxTotal(data.total);
      setTxPages(data.pages);
      setTxPage(page);
    } catch {} finally { setTxLoading(false); }
  }, [txFilter]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadAccounts(), loadSummary(), loadRecentTx(), loadRouting()]);
      setLoading(false);
    };
    init();
  }, [loadAccounts, loadSummary, loadRecentTx, loadRouting]);

  useEffect(() => {
    if (activeTab === 'transactions') loadTransactions(1);
  }, [activeTab, txFilter, loadTransactions]);

  const refresh = async () => {
    await Promise.all([loadAccounts(), loadSummary(), loadRecentTx()]);
    if (activeTab === 'transactions') loadTransactions(txPage);
  };

  const handleDelete = async (account) => {
    if (!window.confirm(`Remove account "${account.name}"? All transaction history will be kept.`)) return;
    try {
      await API.delete(`/accounts/${account._id}`);
      toast.success('Account removed');
      refresh();
    } catch { toast.error('Failed to remove account'); }
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and reconcile your funds</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setModal('add')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors">
            <Plus size={16} />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[['overview', 'Overview'], ['transactions', 'Transactions']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Total Balance Banner */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
            <p className="text-blue-200 text-sm font-medium">Total Balance Across All Accounts</p>
            <p className="text-4xl font-bold mt-1">{fmt(totalBalance)}</p>
            <p className="text-blue-200 text-sm mt-2">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Account Cards */}
          {accounts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
              <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No accounts yet</p>
              <p className="text-sm text-gray-400 mt-1">Add your bank account, cash, or mobile money wallet</p>
              <button onClick={() => setModal('add')}
                className="mt-4 px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition-colors">
                Add First Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map(account => {
                const Icon = TYPE_ICONS[account.type] || Wallet;
                return (
                  <div key={account._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                          <Icon size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{account.name}</p>
                          <p className="text-xs text-gray-400">{TYPE_LABELS[account.type]}</p>
                          {account.accountNumber && (
                            <p className="text-xs text-gray-400">••• {account.accountNumber.slice(-4)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditAccount(account); setModal('editAccount'); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(account)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-2xl font-bold text-gray-900">{fmt(account.balance)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Current Balance</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setPreAccount(account); setModal('deposit'); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                        <ArrowDownCircle size={13} /> Deposit
                      </button>
                      <button
                        onClick={() => { setPreAccount(account); setModal('withdraw'); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                        <ArrowUpCircle size={13} /> Withdraw
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Actions (when accounts exist) */}
          {accounts.length >= 2 && (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setModal('transfer')}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors">
                <ArrowLeftRight size={16} /> Transfer Between Accounts
              </button>
            </div>
          )}

          {/* Reconciliation Card */}
          {summary && accounts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Store vs Accounts Reconciliation</h2>
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div className="p-5 space-y-4">
                {/* Store side */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Store Revenue</p>
                    <p className="text-2xl font-bold text-purple-700 mt-1">{fmt(summary.revenue)}</p>
                    <p className="text-xs text-purple-500 mt-1">{summary.salesCount} sale{summary.salesCount !== 1 ? 's' : ''} approved</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Store Profit</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">{fmt(summary.profit)}</p>
                    <p className="text-xs text-green-500 mt-1">After cost of goods</p>
                  </div>
                </div>

                {/* Expenses row */}
                {summary.totalExpenses > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 bg-orange-50 rounded-xl">
                    <span className="text-sm text-orange-700">Approved Expenses</span>
                    <span className="font-semibold text-orange-700">− {fmt(summary.totalExpenses)}</span>
                  </div>
                )}

                {/* Net vs Accounts */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Net Cash (Revenue − Expenses)</span>
                    <span className="font-semibold text-gray-900">{fmt(summary.netCash)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total in Your Accounts</span>
                    <span className="font-semibold text-gray-900">{fmt(summary.totalAccountBalance)}</span>
                  </div>

                  {/* Difference */}
                  <div className={`flex items-center justify-between p-4 rounded-xl ${
                    Math.abs(summary.difference) < 1
                      ? 'bg-green-50'
                      : summary.difference < 0
                        ? 'bg-red-50'
                        : 'bg-yellow-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      {Math.abs(summary.difference) < 1 ? (
                        <CheckCircle size={18} className="text-green-600" />
                      ) : (
                        <AlertTriangle size={18} className={summary.difference < 0 ? 'text-red-600' : 'text-yellow-600'} />
                      )}
                      <span className={`text-sm font-semibold ${
                        Math.abs(summary.difference) < 1 ? 'text-green-700' :
                        summary.difference < 0 ? 'text-red-700' : 'text-yellow-700'
                      }`}>
                        {Math.abs(summary.difference) < 1
                          ? 'Accounts are balanced'
                          : summary.difference < 0
                            ? `${fmt(Math.abs(summary.difference))} missing from accounts`
                            : `${fmt(summary.difference)} more in accounts than expected`}
                      </span>
                    </div>
                    <span className={`font-bold text-lg ${
                      Math.abs(summary.difference) < 1 ? 'text-green-700' :
                      summary.difference < 0 ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      {Math.abs(summary.difference) < 1 ? '' : summary.difference > 0 ? '+' : '−'}{fmt(Math.abs(summary.difference))}
                    </span>
                  </div>

                  {summary.difference < -100 && (
                    <p className="text-xs text-gray-500">
                      Tip: If funds were spent on stock or other costs, record a withdrawal in the relevant account to keep it balanced.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Auto-Routing Settings */}
          {accounts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Zap size={18} className={routing.enabled ? 'text-yellow-500' : 'text-gray-400'} />
                  <h2 className="font-semibold text-gray-900">Auto-Routing When Sales Are Approved</h2>
                </div>
                <button
                  onClick={() => setRouting(r => ({ ...r, enabled: !r.enabled }))}
                  className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${routing.enabled ? 'text-blue-600' : 'text-gray-400'}`}>
                  {routing.enabled
                    ? <ToggleRight size={28} className="text-blue-600" />
                    : <ToggleLeft size={28} className="text-gray-400" />}
                  {routing.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="p-5 space-y-4">
                {routing.enabled && (
                  <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
                    When you approve a sale: revenue deposits to the <strong>Revenue Account</strong>, then profit is automatically moved to the <strong>Profit Account</strong>.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Revenue Account
                    </label>
                    <select
                      className="input"
                      value={routing.revenueAccountId}
                      onChange={e => setRouting(r => ({ ...r, revenueAccountId: e.target.value }))}>
                      <option value="">— None —</option>
                      {accounts.map(a => (
                        <option key={a._id} value={a._id}>{a.name} ({TYPE_LABELS[a.type]})</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Full sale amount deposits here (e.g. Zenith Bank)</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Profit Account
                    </label>
                    <select
                      className="input"
                      value={routing.profitAccountId}
                      onChange={e => setRouting(r => ({ ...r, profitAccountId: e.target.value }))}>
                      <option value="">— None —</option>
                      {accounts.map(a => (
                        <option key={a._id} value={a._id}>{a.name} ({TYPE_LABELS[a.type]})</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Profit portion moves here automatically (e.g. PiggyVest)</p>
                  </div>
                </div>

                {routing.enabled && routing.revenueAccountId && routing.profitAccountId &&
                  routing.revenueAccountId !== routing.profitAccountId && (
                  <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-green-700 space-y-1">
                    <p className="font-semibold">What happens when a sale is approved:</p>
                    <p>1. Full revenue → <strong>{accounts.find(a => a._id === routing.revenueAccountId)?.name}</strong></p>
                    <p>2. Profit automatically transferred → <strong>{accounts.find(a => a._id === routing.profitAccountId)?.name}</strong></p>
                    <p>3. <strong>{accounts.find(a => a._id === routing.revenueAccountId)?.name}</strong> keeps the cost portion for restocking</p>
                  </div>
                )}

                <button
                  onClick={saveRouting}
                  disabled={routingSaving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors">
                  {routingSaving ? 'Saving...' : 'Save Routing Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {accounts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Recent Activity</h2>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1">
                  View all <ChevronRight size={14} />
                </button>
              </div>

              {recentTx.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No transactions yet. Deposits, withdrawals, and transfers will appear here.
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentTx.map(tx => (
                    <div key={tx._id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${TX_COLORS[tx.type]}`}>
                          {tx.type === 'deposit' && <ArrowDownCircle size={16} />}
                          {tx.type === 'withdrawal' && <ArrowUpCircle size={16} />}
                          {tx.type === 'transfer_in' && <ArrowDownCircle size={16} />}
                          {tx.type === 'transfer_out' && <ArrowUpCircle size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {TX_LABELS[tx.type]}
                            {tx.linkedAccount && (
                              <span className="text-gray-400 font-normal"> · {tx.linkedAccount.name}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">
                            {tx.account?.name} · {format(new Date(tx.date), 'dd MMM yyyy')}
                            {tx.description && ` · ${tx.description}`}
                          </p>
                        </div>
                      </div>
                      <span className={`font-semibold text-sm whitespace-nowrap ${
                        tx.type === 'deposit' || tx.type === 'transfer_in' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.type === 'deposit' || tx.type === 'transfer_in' ? '+' : '−'}{fmt(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Account</label>
                <select className="input text-sm" value={txFilter.accountId}
                  onChange={e => setTxFilter(f => ({ ...f, accountId: e.target.value }))}>
                  <option value="">All Accounts</option>
                  {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Type</label>
                <select className="input text-sm" value={txFilter.type}
                  onChange={e => setTxFilter(f => ({ ...f, type: e.target.value }))}>
                  <option value="">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="transfer_in">Transfer In</option>
                  <option value="transfer_out">Transfer Out</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">From</label>
                <input type="date" className="input text-sm" value={txFilter.startDate}
                  onChange={e => setTxFilter(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">To</label>
                <input type="date" className="input text-sm" value={txFilter.endDate}
                  onChange={e => setTxFilter(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">{txTotal} transaction{txTotal !== 1 ? 's' : ''}</p>
            </div>

            {txLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ArrowLeftRight size={32} className="mx-auto mb-2 opacity-30" />
                <p>No transactions found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {transactions.map(tx => (
                        <tr key={tx._id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                            {format(new Date(tx.date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                            {tx.account?.name}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${TX_COLORS[tx.type]}`}>
                              {TX_LABELS[tx.type]}
                            </span>
                            {tx.linkedAccount && (
                              <span className="text-xs text-gray-400 ml-1">→ {tx.linkedAccount.name}</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-gray-500 max-w-xs truncate">
                            {tx.description || '—'}
                            {tx.reference && <span className="text-gray-400 ml-1">#{tx.reference}</span>}
                          </td>
                          <td className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${
                            tx.type === 'deposit' || tx.type === 'transfer_in' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {tx.type === 'deposit' || tx.type === 'transfer_in' ? '+' : '−'}{fmt(tx.amount)}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-600 whitespace-nowrap">
                            {tx.balanceAfter != null ? fmt(tx.balanceAfter) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {txPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                    <button onClick={() => loadTransactions(txPage - 1)} disabled={txPage <= 1}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 disabled:opacity-30">
                      Previous
                    </button>
                    <p className="text-sm text-gray-500">Page {txPage} of {txPages}</p>
                    <button onClick={() => loadTransactions(txPage + 1)} disabled={txPage >= txPages}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 disabled:opacity-30">
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {modal === 'add' && (
        <AccountModal onClose={() => setModal(null)} onSaved={refresh} />
      )}
      {modal === 'editAccount' && editAccount && (
        <AccountModal account={editAccount} onClose={() => { setModal(null); setEditAccount(null); }} onSaved={refresh} />
      )}
      {modal === 'deposit' && (
        <DepositModal accounts={accounts} preAccount={preAccount} onClose={() => { setModal(null); setPreAccount(null); }} onSaved={refresh} />
      )}
      {modal === 'withdraw' && (
        <WithdrawModal accounts={accounts} preAccount={preAccount} onClose={() => { setModal(null); setPreAccount(null); }} onSaved={refresh} />
      )}
      {modal === 'transfer' && (
        <TransferModal accounts={accounts} onClose={() => setModal(null)} onSaved={refresh} />
      )}
    </div>
  );
}
