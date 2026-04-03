import { useState, useEffect, useCallback } from 'react';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import PremiumGate from '../components/PremiumGate';
import { Plus, Search, Upload, Pencil, Trash2, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6b7280'];
const MONTHS = ['This month','Last 3 months','This year','All time'];

export default function ExpensesPage() {
  const { isPremium, loading: premLoading } = usePremium();
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
  const [editTx, setEditTx] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [form, setForm] = useState({ type:'expense', amount:'', description:'', categoryId:'', bankAccountId:'', transactionDate: new Date().toISOString().split('T')[0], merchant:'', notes:'' });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    if (!isPremium) return;
    setLoading(true);
    try {
      const [txRes, catRes, accRes, anaRes] = await Promise.all([
        api.get('/bank/transactions', { params: { limit: 100, type: typeFilter || undefined, search: search || undefined } }),
        api.get('/bank/categories'),
        api.get('/bank/accounts'),
        api.get('/bank/analytics', { params: { period } }),
      ]);
      setTxs(txRes.data.transactions);
      setTotal(txRes.data.total);
      setCategories(catRes.data.categories);
      setAccounts(accRes.data.accounts);
      setAnalytics(anaRes.data);
    } catch { } finally { setLoading(false); }
  }, [isPremium, typeFilter, search, period]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    await api.post('/bank/transactions', form);
    setShowAdd(false);
    setForm({ type:'expense', amount:'', description:'', categoryId:'', bankAccountId:'', transactionDate: new Date().toISOString().split('T')[0], merchant:'', notes:'' });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete transaction?')) return;
    await api.delete(`/bank/transactions/${id}`);
    load();
  }

  async function handleCSV() {
    if (!csvFile) return;
    const formData = new FormData();
    formData.append('file', csvFile);
    const res = await api.post('/bank/transactions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    alert(`Imported ${res.data.inserted} transactions (${res.data.skipped} skipped)`);
    setCsvFile(null);
    load();
  }

  if (premLoading) return <div className="text-gray-400 text-sm">Loading…</div>;
  if (!isPremium) return <PremiumGate feature="Expense Manager" />;

  const byCategory = analytics?.byCategory || [];
  const totals = analytics?.totals || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Expenses</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track and categorise every transaction</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <label className="btn-secondary text-sm py-2 flex items-center gap-2 cursor-pointer">
            <Upload size={14} />
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={e => { setCsvFile(e.target.files[0]); }} />
          </label>
          {csvFile && (
            <button onClick={handleCSV} className="btn-primary text-sm py-2">Import "{csvFile.name}"</button>
          )}
          <button onClick={() => setShowAdd(p => !p)} className="btn-primary text-sm py-2 flex items-center gap-2">
            <Plus size={14} /> Add transaction
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Month income', value: formatINR(totals.month_income || 0), color: 'text-green-600' },
          { label: 'Month expense', value: formatINR(totals.month_expense || 0), color: 'text-red-600' },
          { label: 'Month net', value: formatINR((totals.month_income||0) - (totals.month_expense||0)),
            color: (totals.month_income||0) >= (totals.month_expense||0) ? 'text-green-600' : 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className={`text-lg font-semibold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category breakdown */}
        {byCategory.length > 0 && (
          <div className="card">
            <div className="text-sm font-medium text-gray-700 mb-3">By category</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={byCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="total">
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {byCategory.slice(0, 5).map((c, i) => (
                <div key={c.name || i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600">{c.name || 'Uncategorised'}</span>
                  </div>
                  <span className="font-medium text-gray-700">{formatINR(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions list */}
        <div className={`${byCategory.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-3`}>
          {/* Add form */}
          {showAdd && (
            <div className="card">
              <div className="text-sm font-medium text-gray-700 mb-3">Add transaction</div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Type</label>
                    <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select></div>
                  <div><label className="label">Amount (₹)</label>
                    <input className="input" type="number" step="0.01" placeholder="500" value={form.amount}
                      onChange={e => set('amount', e.target.value)} required /></div>
                  <div className="col-span-2"><label className="label">Description</label>
                    <input className="input" placeholder="Swiggy order" value={form.description}
                      onChange={e => set('description', e.target.value)} required /></div>
                  <div><label className="label">Category</label>
                    <select className="input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                      <option value="">None</option>
                      {categories.filter(c => c.type === form.type).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select></div>
                  <div><label className="label">Account</label>
                    <select className="input" value={form.bankAccountId} onChange={e => set('bankAccountId', e.target.value)}>
                      <option value="">None</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                    </select></div>
                  <div><label className="label">Date</label>
                    <input className="input" type="date" value={form.transactionDate}
                      onChange={e => set('transactionDate', e.target.value)} required /></div>
                  <div><label className="label">Merchant (optional)</label>
                    <input className="input" placeholder="Swiggy" value={form.merchant}
                      onChange={e => set('merchant', e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-sm py-2">Save</button>
                  <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm py-2">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-36">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-8 text-sm" placeholder="Search transactions…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input w-auto text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select className="input w-auto text-sm" value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="month">This month</option>
              <option value="year">This year</option>
              <option value="">All time</option>
            </select>
          </div>

          {/* List */}
          <div className="card divide-y divide-gray-50">
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading transactions…</div>
            ) : txs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No transactions found. Add one or import a CSV.</div>
            ) : (
              txs.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                    style={{ background: tx.category_color ? `${tx.category_color}20` : '#f3f4f6', color: tx.category_color || '#6b7280' }}>
                    {tx.category_icon ? tx.category_icon.charAt(0).toUpperCase() : '·'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{tx.description}</div>
                    <div className="text-xs text-gray-400">
                      {tx.category_name || 'Uncategorised'} · {new Date(tx.transaction_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => handleDelete(tx.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {total > txs.length && (
            <div className="text-center text-xs text-gray-400">Showing {txs.length} of {total} transactions</div>
          )}
        </div>
      </div>
    </div>
  );
}
