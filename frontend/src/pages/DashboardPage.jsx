import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import {
  CheckCircle, AlertTriangle, AlertCircle, Info, ChevronRight,
  SlidersHorizontal, MessageCircle, Crown, TrendingUp, TrendingDown,
  Plus, Pencil, Trash2, Target, Home, Car, Briefcase, X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const ALERT_STYLES = {
  success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/40',
  warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-800/40',
  danger:  'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-800/40',
  info:    'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40',
};

function HealthGauge({ score }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#3b82f6' : '#f59e0b';
  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Average' : 'Needs work';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 251.2} 251.2`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-bold text-gray-900 dark:text-white">{score}</div>
          <div className="text-[10px] text-gray-400">/100</div>
        </div>
      </div>
      <div className="text-xs font-semibold mt-1" style={{ color }}>{label}</div>
    </div>
  );
}

// ── Modal for adding assets / liabilities / goals ─────────────────────────────
function AddModal({ type, onClose, onSave }) {
  const ASSET_CATS = ['real_estate','vehicle','gold','crypto','fd','ppf','nps','epf','insurance','business','other'];
  const LIAB_TYPES = ['home_loan','car_loan','personal_loan','education_loan','credit_card','gold_loan','business_loan','other'];
  const GOAL_TYPES = ['emergency_fund','house','car','education','retirement','travel','wedding','business','other'];
  const GOAL_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];

  const [form, setForm] = useState({ color: GOAL_COLORS[0] });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const mapped = type === 'asset'
      ? { name: form.name, assetCategory: form.assetCategory, currentValue: parseFloat(form.currentValue), purchaseValue: form.purchaseValue ? parseFloat(form.purchaseValue) : undefined, purchaseDate: form.purchaseDate, notes: form.notes }
      : type === 'liability'
      ? { name: form.name, liabilityType: form.liabilityType, outstandingAmount: parseFloat(form.outstandingAmount), originalAmount: form.originalAmount ? parseFloat(form.originalAmount) : undefined, interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined, emiAmount: form.emiAmount ? parseFloat(form.emiAmount) : undefined, notes: form.notes }
      : { name: form.name, goalType: form.goalType, targetAmount: parseFloat(form.targetAmount), currentAmount: form.currentAmount ? parseFloat(form.currentAmount) : 0, targetDate: form.targetDate, monthlyContribution: form.monthlyContribution ? parseFloat(form.monthlyContribution) : undefined, color: form.color };
    onSave(mapped);
  };

  const titles = { asset: 'Add Asset', liability: 'Add Liability', goal: 'Add Goal' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">{titles[type]}</h3>
          <button onClick={onClose} className="btn-ghost w-8 h-8 flex items-center justify-center"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="label">Name / Description <span className="text-red-500">*</span></label>
            <input className="input" placeholder={type === 'asset' ? 'e.g. Home in Bangalore' : type === 'liability' ? 'e.g. HDFC Home Loan' : 'e.g. Buy a House'} value={form.name || ''} onChange={e => set('name', e.target.value)} required /></div>

          {type === 'asset' && (<>
            <div><label className="label">Asset category <span className="text-red-500">*</span></label>
              <select className="input" value={form.assetCategory || ''} onChange={e => set('assetCategory', e.target.value)} required>
                <option value="">Select category</option>
                {ASSET_CATS.map(c => <option key={c} value={c}>{c.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Current value (₹) <span className="text-red-500">*</span></label>
                <input className="input" type="number" min="0" placeholder="5000000" value={form.currentValue || ''} onChange={e => set('currentValue', e.target.value)} required /></div>
              <div><label className="label">Purchase value (₹)</label>
                <input className="input" type="number" min="0" placeholder="4500000" value={form.purchaseValue || ''} onChange={e => set('purchaseValue', e.target.value)} /></div>
              <div><label className="label">Purchase date</label>
                <input className="input" type="date" value={form.purchaseDate || ''} onChange={e => set('purchaseDate', e.target.value)} /></div>
            </div>
          </>)}

          {type === 'liability' && (<>
            <div><label className="label">Liability type <span className="text-red-500">*</span></label>
              <select className="input" value={form.liabilityType || ''} onChange={e => set('liabilityType', e.target.value)} required>
                <option value="">Select type</option>
                {LIAB_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Outstanding (₹) <span className="text-red-500">*</span></label>
                <input className="input" type="number" min="0" placeholder="2500000" value={form.outstandingAmount || ''} onChange={e => set('outstandingAmount', e.target.value)} required /></div>
              <div><label className="label">EMI (₹/month)</label>
                <input className="input" type="number" min="0" placeholder="25000" value={form.emiAmount || ''} onChange={e => set('emiAmount', e.target.value)} /></div>
              <div><label className="label">Interest rate (%)</label>
                <input className="input" type="number" min="0" step="0.1" placeholder="8.5" value={form.interestRate || ''} onChange={e => set('interestRate', e.target.value)} /></div>
            </div>
          </>)}

          {type === 'goal' && (<>
            <div><label className="label">Goal type <span className="text-red-500">*</span></label>
              <select className="input" value={form.goalType || ''} onChange={e => set('goalType', e.target.value)} required>
                <option value="">Select type</option>
                {GOAL_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Target amount (₹) <span className="text-red-500">*</span></label>
                <input className="input" type="number" min="1" placeholder="5000000" value={form.targetAmount || ''} onChange={e => set('targetAmount', e.target.value)} required /></div>
              <div><label className="label">Saved so far (₹)</label>
                <input className="input" type="number" min="0" placeholder="0" value={form.currentAmount || ''} onChange={e => set('currentAmount', e.target.value)} /></div>
              <div><label className="label">Target date</label>
                <input className="input" type="date" value={form.targetDate || ''} onChange={e => set('targetDate', e.target.value)} /></div>
              <div><label className="label">Monthly contribution (₹)</label>
                <input className="input" type="number" min="0" placeholder="10000" value={form.monthlyContribution || ''} onChange={e => set('monthlyContribution', e.target.value)} /></div>
            </div>
            <div><label className="label">Color</label>
              <div className="flex gap-2 mt-1">{GOAL_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('color', c)}
                  className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-300 dark:ring-offset-gray-900' : ''}`}
                  style={{ background: c }} />
              ))}</div></div>
          </>)}

          <div><label className="label">Notes</label>
            <input className="input" placeholder="Optional notes…" value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>

          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary text-sm py-2 flex-1">Save</button>
            <button type="button" onClick={onClose} className="btn-secondary text-sm py-2">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { plan, isPro } = usePremium();
  const [scores, setScores] = useState([]);
  const [allocation, setAllocation] = useState(null);
  const [netWorth, setNetWorth] = useState(null);
  const [nwHistory, setNwHistory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'asset' | 'liability' | 'goal'

  useEffect(() => { loadAll(); }, [isPro]);

  async function loadAll() {
    const calls = [
      api.get('/finance/health-score').catch(() => ({ data: { scores: [] } })),
      api.get('/networth').catch(() => ({ data: null })),
      api.get('/networth/history').catch(() => ({ data: { history: [] } })),
      api.get('/networth/assets').catch(() => ({ data: { assets: [] } })),
      api.get('/networth/liabilities').catch(() => ({ data: { liabilities: [] } })),
      api.get('/networth/goals').catch(() => ({ data: { goals: [] } })),
    ];
    if (isPro) calls.push(api.get('/finance/history').catch(() => ({ data: { allocations: [] } })));

    const results = await Promise.all(calls);
    setScores(results[0].data.scores || []);
    setNetWorth(results[1].data);
    setNwHistory((results[2].data.history || []).reverse());
    setAssets(results[3].data.assets || []);
    setLiabilities(results[4].data.liabilities || []);
    setGoals(results[5].data.goals || []);
    if (isPro && results[6]) setAllocation((results[6].data.allocations || [])[0] || null);
    setLoading(false);
  }

  async function handleSave(type, data) {
    const endpoints = { asset: '/networth/assets', liability: '/networth/liabilities', goal: '/networth/goals' };
    await api.post(endpoints[type], data);
    setModal(null);
    loadAll();
  }

  async function handleDeleteItem(type, id) {
    if (!confirm(`Delete this ${type}?`)) return;
    const endpoints = { asset: `/networth/assets/${id}`, liability: `/networth/liabilities/${id}`, goal: `/networth/goals/${id}` };
    await api.delete(endpoints[type]).catch(() => {});
    loadAll();
  }

  const latestScore = scores[0]?.score || 0;
  const nw = netWorth?.netWorth || 0;
  const totalAssets = netWorth?.totalAssets || 0;
  const totalLiabs  = netWorth?.totalLiabilities || 0;
  const nwPositive = nw >= 0;
  const firstName = user?.name?.split(' ')[0];

  const alerts = [
    !allocation && { type: 'info', msg: 'Set up your salary profile in Salary Allocator for personalised advice' },
    scores[0] && !scores[0].emergency_fund_ok && { type: 'danger', msg: 'Emergency fund below 3 months — highest priority' },
    scores[0] && !scores[0].has_insurance    && { type: 'warning', msg: 'No term insurance detected — protect your dependants' },
    scores[0] && scores[0].has_investments   && { type: 'success', msg: 'SIP active — long-term wealth building in progress' },
  ].filter(Boolean);

  const ICON_MAP = { CheckCircle, AlertTriangle, AlertCircle, Info };
  const alertIconMap = { success: CheckCircle, warning: AlertTriangle, danger: AlertCircle, info: Info };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Good day, {firstName} 👋</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Your complete financial picture</p>
        </div>
        {plan === 'free' && (
          <Link to="/subscription" className="btn-primary text-sm py-2 flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600">
            <Crown size={13} /> Upgrade Plan
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400 dark:text-gray-600 animate-pulse text-sm">Loading your financial picture…</div>
      ) : (<>

        {/* ── NET WORTH HERO ─────────────────────────────────────────────── */}
        <div className="card bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 border-0 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Net Worth</div>
              <div className={`text-4xl font-extrabold tabular-nums mt-1 ${nwPositive ? 'text-white' : 'text-red-300'}`}>
                {formatINR(nw)}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-blue-100">
                <span>Assets: {formatINR(totalAssets)}</span>
                <span>·</span>
                <span>Liabilities: {formatINR(totalLiabs)}</span>
              </div>
            </div>
            <HealthGauge score={latestScore} />
          </div>

          {/* Net worth history sparkline */}
          {nwHistory.length > 1 && (
            <ResponsiveContainer width="100%" height={60}>
              <AreaChart data={nwHistory}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="white" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="white" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="net_worth" stroke="white" strokeWidth={2}
                  fill="url(#nwGrad)" dot={false} />
                <Tooltip formatter={(v) => [formatINR(v), 'Net Worth']}
                  contentStyle={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 8, fontSize: 11, color: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── ASSET / LIABILITY GRID ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Liquid assets',   value: netWorth?.liquidAssets || 0,   color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Investments',     value: (netWorth?.components?.portfolio || 0) + (netWorth?.components?.externalPortfolio || 0), color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Physical assets', value: netWorth?.illiquidAssets || 0, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Total debt',      value: totalLiabs,                    color: totalLiabs > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <div className="stat-label">{label}</div>
              <div className={`text-lg font-bold tabular-nums ${color}`}>{formatINR(value)}</div>
            </div>
          ))}
        </div>

        {/* ── ASSETS LIST ───────────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title mb-0">Assets</div>
            <button onClick={() => setModal('asset')} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <Plus size={12} /> Add
            </button>
          </div>
          {assets.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-gray-400 dark:text-gray-600 text-sm">No assets added yet</div>
              <button onClick={() => setModal('asset')} className="text-blue-600 dark:text-blue-400 text-xs mt-1 hover:underline">Add your first asset →</button>
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map(a => {
                const gain = a.purchase_value ? ((a.current_value - a.purchase_value) / a.purchase_value * 100).toFixed(1) : null;
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 group transition-colors">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{a.asset_category?.[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.name}</div>
                      <div className="text-xs text-gray-400 capitalize">{a.asset_category?.replace('_',' ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">{formatINR(a.current_value)}</div>
                      {gain && <div className={`text-xs ${parseFloat(gain) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{gain >= 0 ? '+' : ''}{gain}%</div>}
                    </div>
                    <button onClick={() => handleDeleteItem('asset', a.id)} className="opacity-0 group-hover:opacity-100 btn-ghost w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── LIABILITIES LIST ──────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title mb-0">Liabilities</div>
            <button onClick={() => setModal('liability')} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <Plus size={12} /> Add
            </button>
          </div>
          {liabilities.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-gray-400 dark:text-gray-600 text-sm">No liabilities added</div>
              <button onClick={() => setModal('liability')} className="text-blue-600 dark:text-blue-400 text-xs mt-1 hover:underline">Add a loan or debt →</button>
            </div>
          ) : (
            <div className="space-y-2">
              {liabilities.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 group transition-colors">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">{l.liability_type?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{l.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <span className="capitalize">{l.liability_type?.replace('_',' ')}</span>
                      {l.interest_rate && <span>{l.interest_rate}% p.a.</span>}
                      {l.emi_amount && <span>EMI: {formatINR(l.emi_amount)}</span>}
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">{formatINR(l.outstanding_amount)}</div>
                  <button onClick={() => handleDeleteItem('liability', l.id)} className="opacity-0 group-hover:opacity-100 btn-ghost w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── GOALS ────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title mb-0">Financial Goals</div>
            <button onClick={() => setModal('goal')} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <Plus size={12} /> Add goal
            </button>
          </div>
          {goals.length === 0 ? (
            <div className="text-center py-6">
              <Target size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <div className="text-gray-400 dark:text-gray-600 text-sm">No goals set yet</div>
              <button onClick={() => setModal('goal')} className="text-blue-600 dark:text-blue-400 text-xs mt-1 hover:underline">Set your first goal →</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goals.map(g => {
                const pct = g.target_amount > 0 ? Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100) : 0;
                const monthsLeft = g.target_date ? Math.max(0, Math.round((new Date(g.target_date) - new Date()) / (30 * 24 * 60 * 60 * 1000))) : null;
                return (
                  <div key={g.id} className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 group transition-colors relative">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{g.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2 mt-0.5">
                          <span className="capitalize">{g.goal_type?.replace('_',' ')}</span>
                          {monthsLeft !== null && <span>· {monthsLeft} months left</span>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteItem('goal', g.id)} className="opacity-0 group-hover:opacity-100 btn-ghost w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-600 dark:text-gray-400">{formatINR(g.current_amount)} saved</span>
                      <span className="text-gray-400">of {formatINR(g.target_amount)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: g.color || '#3b82f6' }} />
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs">
                      <span className="font-semibold" style={{ color: g.color || '#3b82f6' }}>{pct}%</span>
                      {g.monthly_contribution && <span className="text-gray-400">{formatINR(g.monthly_contribution)}/mo</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── ALERTS ───────────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div className="card">
            <div className="section-title">Alerts</div>
            <div className="space-y-2">
              {alerts.map((a, i) => {
                const Icon = alertIconMap[a.type] || Info;
                return (
                  <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm ${ALERT_STYLES[a.type]}`}>
                    <Icon size={14} className="flex-shrink-0 mt-0.5" /> {a.msg}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── UPGRADE NUDGE ─────────────────────────────────────────────── */}
        {plan === 'free' && (
          <div className="card border-amber-200 dark:border-amber-800/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Crown size={20} className="text-amber-500" />
                <div>
                  <div className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Unlock Pro for ₹99/month</div>
                  <div className="text-xs text-amber-700 dark:text-amber-400">50 AI messages/day · Simulator · History · More</div>
                </div>
              </div>
              <Link to="/subscription" className="btn-primary text-sm py-2 bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5">
                <Crown size={13} /> Upgrade
              </Link>
            </div>
          </div>
        )}
      </>)}

      {/* ── MODALS ─────────────────────────────────────────────────────── */}
      {modal && (
        <AddModal type={modal} onClose={() => setModal(null)} onSave={(data) => handleSave(modal, data)} />
      )}
    </div>
  );
}
