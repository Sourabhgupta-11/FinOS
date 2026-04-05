import { useState, useEffect, useCallback } from 'react';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import PremiumGate from '../components/PremiumGate';
import { Plus, Search, Upload, Download, Trash2, Link2, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6b7280'];

export default function ExpensesPage() {
  const { isPremium: isPro, loading: premLoading } = usePremium();
  const [txs, setTxs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('month');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({
    type: 'expense', amount: '', description: '', categoryId: '',
    bankAccountId: '', transactionDate: new Date().toISOString().split('T')[0],
    merchant: '', notes: '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    if (!isPro) return;
    setLoading(true);
    try {
      const [txRes, catRes, accRes, anaRes] = await Promise.all([
        api.get('/bank/transactions', { params: { limit: 100, type: typeFilter || undefined, search: search || undefined } }),
        api.get('/bank/categories'),
        api.get('/bank/accounts'),
        api.get('/bank/analytics', { params: { period } }),
      ]);
      setTxs(txRes.data.transactions || []);
      setTotal(txRes.data.total || 0);
      setCategories(catRes.data.categories || []);
      setAccounts(accRes.data.accounts || []);
      setAnalytics(anaRes.data);
    } catch { } finally { setLoading(false); }
  }, [isPro, typeFilter, search, period]);

  useEffect(() => { if (!premLoading) load(); }, [premLoading, load]);

  async function handleAdd(e) {
    e.preventDefault();
    await api.post('/bank/transactions', form);
    setShowAdd(false);
    setForm({ type:'expense', amount:'', description:'', categoryId:'', bankAccountId:'', transactionDate: new Date().toISOString().split('T')[0], merchant:'', notes:'' });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return;
    await api.delete(`/bank/transactions/${id}`).catch(() => {});
    load();
  }

  async function handleCSVImport() {
    if (!csvFile) return;
    setCsvLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const res = await api.post('/bank/transactions/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert(`✓ Imported ${res.data.inserted} transactions. ${res.data.skipped} skipped.`);
      setCsvFile(null);
      load();
    } catch { alert('Import failed. Please check CSV format.'); }
    finally { setCsvLoading(false); }
  }

  function handleCSVExport() {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Account', 'Merchant'];
    const rows = txs.map(t => [
      t.transaction_date?.split('T')[0] || '',
      `"${t.description?.replace(/"/g, '""') || ''}"`,
      t.category_name || '',
      t.type,
      t.amount,
      t.account_name || '',
      t.merchant || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finos-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function handleSyncAll() {
    setSyncing(true);
    try {
      const accRes = await api.get('/bank/accounts');
      const linkedAccs = (accRes.data.accounts || []).filter(a => a.setu_consent_id);
      if (linkedAccs.length === 0) {
        alert('No linked bank accounts found. Link a bank account first.');
        return;
      }
      for (const acc of linkedAccs) {
        await api.post('/bank/setu/callback', { accountId: acc.id, consentId: acc.setu_consent_id }).catch(() => {});
      }
      load();
    } finally { setSyncing(false); }
  }

  if (premLoading) return <div className="text-gray-400 animate-pulse text-sm">Loading…</div>;
  if (!isPro) return <PremiumGate requiredPlan="premium" feature="Expense Manager" />;

  const byCategory = analytics?.byCategory || [];
  const totals = analytics?.totals || {};
  const monthNet = (totals.month_income || 0) - (totals.month_expense || 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Track every rupee in and out</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleSyncAll} disabled={syncing}
            className="btn-secondary text-sm py-2 flex items-center gap-1.5">
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Bank'}
          </button>
          <button onClick={handleCSVExport} className="btn-secondary text-sm py-2 flex items-center gap-1.5">
            <Download size={13} /> Export CSV
          </button>
          <label className="btn-secondary text-sm py-2 flex items-center gap-1.5 cursor-pointer">
            <Upload size={13} /> Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files[0])} />
          </label>
          {csvFile && (
            <button onClick={handleCSVImport} disabled={csvLoading}
              className="btn-primary text-sm py-2 flex items-center gap-1.5">
              {csvLoading ? 'Importing…' : `Import "${csvFile.name.slice(0, 15)}…"`}
            </button>
          )}
          <button onClick={() => setShowAdd(p => !p)} className="btn-primary text-sm py-2 flex items-center gap-1.5">
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Income this month',  value: formatINR(totals.month_income || 0),  color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Spent this month',   value: formatINR(totals.month_expense || 0), color: 'text-red-600 dark:text-red-400' },
          { label: 'Net this month',     value: formatINR(monthNet),                  color: monthNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category chart */}
        {byCategory.length > 0 && (
          <div className="card">
            <div className="section-title">By category</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={byCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="total" paddingAngle={2}>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)}
                  contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-1">
              {byCategory.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 dark:text-gray-400">{c.name || 'Other'}</span>
                  </div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatINR(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        <div className={`${byCategory.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-3`}>
          {/* Add form */}
          {showAdd && (
            <div className="card">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add transaction</div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Type</label>
                    <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Amount (₹) <span className="text-red-500">*</span></label>
                    <input className="input" type="number" min="0.01" step="0.01" placeholder="500"
                      value={form.amount} onChange={e => set('amount', e.target.value)} required />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description <span className="text-red-500">*</span></label>
                    <input className="input" placeholder="Swiggy order, salary credit…"
                      value={form.description} onChange={e => set('description', e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select className="input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                      <option value="">Uncategorised</option>
                      {categories.filter(c => c.type === form.type).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Bank account</label>
                    <select className="input" value={form.bankAccountId} onChange={e => set('bankAccountId', e.target.value)}>
                      <option value="">None</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Date <span className="text-red-500">*</span></label>
                    <input className="input" type="date" value={form.transactionDate}
                      onChange={e => set('transactionDate', e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Merchant</label>
                    <input className="input" placeholder="Swiggy, Amazon…"
                      value={form.merchant} onChange={e => set('merchant', e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-sm py-2">Save transaction</button>
                  <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm py-2">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-36">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-8 text-sm" placeholder="Search transactions…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input w-auto text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              <option value="income">Income only</option>
              <option value="expense">Expenses only</option>
            </select>
            <select className="input w-auto text-sm" value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="month">This month</option>
              <option value="year">This year</option>
              <option value="">All time</option>
            </select>
          </div>

          {/* List */}
          <div className="card divide-y divide-gray-50 dark:divide-gray-800/60">
            {loading ? (
              <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm animate-pulse">Loading…</div>
            ) : txs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-600 text-sm">No transactions found</div>
                <div className="text-gray-300 dark:text-gray-700 text-xs mt-1">Add manually, import CSV, or sync your bank</div>
              </div>
            ) : txs.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{
                    background: tx.category_color ? `${tx.category_color}20` : '#f3f4f6',
                    color: tx.category_color || '#9ca3af',
                  }}>
                  {tx.category_name ? tx.category_name.charAt(0) : '₹'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                    <span>{tx.category_name || 'Uncategorised'}</span>
                    <span>·</span>
                    <span>{new Date(tx.transaction_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</span>
                    {tx.account_name && <><span>·</span><span>{tx.account_name}</span></>}
                  </div>
                </div>
                <div className={`text-sm font-bold tabular-nums flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                </div>
                <button onClick={() => handleDelete(tx.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {total > txs.length && (
            <div className="text-center text-xs text-gray-400 dark:text-gray-600">
              Showing {txs.length} of {total} transactions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
