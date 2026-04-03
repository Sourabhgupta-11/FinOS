import { useState, useEffect } from 'react';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import PremiumGate from '../components/PremiumGate';
import { Plus, Target, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

export default function BudgetsPage() {
  const { isPremium, loading: premLoading } = usePremium();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', categoryId:'', amount:'', period:'monthly', alertAtPct: 80 });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { if (isPremium) load(); }, [isPremium]);

  async function load() {
    try {
      const [bRes, cRes] = await Promise.all([api.get('/bank/budgets'), api.get('/bank/categories')]);
      setBudgets(bRes.data.budgets);
      setCategories(cRes.data.categories.filter(c => c.type === 'expense'));
    } catch { } finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    await api.post('/bank/budgets', form);
    setShowAdd(false);
    setForm({ name:'', categoryId:'', amount:'', period:'monthly', alertAtPct: 80 });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this budget?')) return;
    await api.delete(`/bank/budgets/${id}`);
    load();
  }

  if (premLoading) return <div className="text-gray-400 text-sm">Loading…</div>;
  if (!isPremium) return <PremiumGate feature="Budget Manager" />;

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalSpent  = budgets.reduce((s, b) => s + parseFloat(b.spent || 0), 0);
  const overBudget  = budgets.filter(b => b.pct >= 100).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Budgets</h1>
          <p className="text-gray-400 text-sm mt-0.5">Set monthly spending limits and get alerts</p>
        </div>
        <button onClick={() => setShowAdd(p => !p)} className="btn-primary text-sm py-2 flex items-center gap-2">
          <Plus size={14} /> Add budget
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total budgeted', value: formatINR(totalBudget) },
          { label: 'Total spent', value: formatINR(totalSpent), color: totalSpent > totalBudget ? 'text-red-600' : 'text-gray-900' },
          { label: 'Over budget', value: `${overBudget} category${overBudget !== 1 ? 's' : ''}`, color: overBudget > 0 ? 'text-red-600' : 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className={`text-lg font-semibold ${color || 'text-gray-900'}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card">
          <div className="text-sm font-medium text-gray-700 mb-3">New budget</div>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Budget name</label>
                <input className="input" placeholder="Dining out" value={form.name}
                  onChange={e => set('name', e.target.value)} required />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Monthly limit (₹)</label>
                <input className="input" type="number" placeholder="3000" value={form.amount}
                  onChange={e => set('amount', e.target.value)} required />
              </div>
              <div>
                <label className="label">Alert when spent reaches</label>
                <select className="input" value={form.alertAtPct} onChange={e => set('alertAtPct', parseInt(e.target.value))}>
                  {[50, 60, 70, 75, 80, 90, 100].map(p => <option key={p} value={p}>{p}%</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm py-2">Create budget</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Budget cards */}
      {loading ? (
        <div className="text-gray-400 text-sm">Loading budgets…</div>
      ) : budgets.length === 0 ? (
        <div className="card text-center py-12">
          <Target size={32} className="text-gray-200 mx-auto mb-3" />
          <div className="text-gray-500 text-sm">No budgets yet</div>
          <div className="text-gray-400 text-xs mt-1">Create a budget to control your spending</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map(b => {
            const pct = b.pct || 0;
            const remaining = parseFloat(b.amount) - parseFloat(b.spent || 0);
            const barColor = pct >= 100 ? '#ef4444' : pct >= b.alert_at_pct ? '#f59e0b' : '#10b981';
            const StatusIcon = pct >= 100 ? AlertTriangle : CheckCircle;
            const statusColor = pct >= 100 ? 'text-red-500' : pct >= b.alert_at_pct ? 'text-amber-500' : 'text-green-500';
            return (
              <div key={b.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{b.name}</div>
                    <div className="text-xs text-gray-400">{b.category_name || 'All expenses'} · {b.period}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusIcon size={15} className={statusColor} />
                    <button onClick={() => handleDelete(b.id)} className="p-1 text-gray-300 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-600">Spent: <strong>{formatINR(b.spent || 0)}</strong></span>
                  <span className="text-gray-400">of {formatINR(b.amount)}</span>
                </div>

                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: barColor }} className="font-medium">{pct}% used</span>
                  <span className={`${remaining >= 0 ? 'text-gray-400' : 'text-red-600 font-medium'}`}>
                    {remaining >= 0 ? `${formatINR(remaining)} left` : `${formatINR(Math.abs(remaining))} over`}
                  </span>
                </div>

                {pct >= b.alert_at_pct && pct < 100 && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg">
                    ⚠ Approaching limit — {100 - pct}% remaining
                  </div>
                )}
                {pct >= 100 && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-lg">
                    Over budget by {formatINR(Math.abs(remaining))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
