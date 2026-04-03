import { useState, useEffect } from 'react';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import PremiumGate from '../components/PremiumGate';
import { TrendingUp, TrendingDown, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const ASSET_TYPES = ['stock','mutual_fund','etf','gold','fd','ppf','nps','crypto','other'];
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#6b7280'];

export default function PortfolioPage() {
  const { isPremium, loading: premLoading } = usePremium();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ symbol:'', name:'', assetType:'stock', quantity:'', avgBuyPrice:'', exchange:'NSE' });

  useEffect(() => { if (isPremium) fetchPortfolio(); }, [isPremium]);

  async function fetchPortfolio() {
    try {
      const res = await api.get('/portfolio');
      setData(res.data);
    } catch { /* premium gate handles 402 */ }
    finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    await api.post('/portfolio', form);
    setForm({ symbol:'', name:'', assetType:'stock', quantity:'', avgBuyPrice:'', exchange:'NSE' });
    setShowForm(false);
    fetchPortfolio();
  }

  async function handleDelete(id) {
    if (!confirm('Remove this holding?')) return;
    await api.delete(`/portfolio/${id}`);
    fetchPortfolio();
  }

  async function handleRefresh() {
    setRefreshing(true);
    await api.post('/portfolio/refresh').catch(() => {});
    await fetchPortfolio();
    setRefreshing(false);
  }

  if (premLoading || loading) return <div className="text-gray-400 text-sm">Loading…</div>;
  if (!isPremium) return <PremiumGate feature="Portfolio Tracker" />;

  const summary = data?.summary || {};
  const holdings = data?.holdings || [];
  const byType = data?.byAssetType || {};
  const pieData = Object.entries(byType).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Portfolio</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track all your investments in one place</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="btn-secondary flex items-center gap-2 text-sm py-2">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh prices
          </button>
          <button onClick={() => setShowForm(p => !p)} className="btn-primary flex items-center gap-2 text-sm py-2">
            <Plus size={14} /> Add holding
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total invested', value: formatINR(summary.totalInvested || 0) },
          { label: 'Current value', value: formatINR(summary.totalCurrent || 0) },
          { label: 'Total gain/loss', value: formatINR(summary.totalGain || 0), color: (summary.totalGain||0) >= 0 ? 'text-green-600' : 'text-red-600' },
          { label: 'Overall return', value: `${summary.totalGainPct || 0}%`, color: (summary.totalGainPct||0) >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className={`text-xl font-semibold ${color || 'text-gray-900'}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card">
          <div className="text-sm font-medium text-gray-700 mb-4">Add holding</div>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Symbol</label>
                <input className="input uppercase" placeholder="RELIANCE" value={form.symbol}
                  onChange={e => setForm(p => ({...p, symbol: e.target.value.toUpperCase()}))} required /></div>
              <div><label className="label">Name</label>
                <input className="input" placeholder="Reliance Industries" value={form.name}
                  onChange={e => setForm(p => ({...p, name: e.target.value}))} required /></div>
              <div><label className="label">Asset type</label>
                <select className="input" value={form.assetType} onChange={e => setForm(p => ({...p, assetType: e.target.value}))}>
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select></div>
              <div><label className="label">Exchange</label>
                <select className="input" value={form.exchange} onChange={e => setForm(p => ({...p, exchange: e.target.value}))}>
                  <option value="NSE">NSE</option><option value="BSE">BSE</option><option value="OTHER">Other</option>
                </select></div>
              <div><label className="label">Quantity</label>
                <input className="input" type="number" step="0.001" placeholder="10" value={form.quantity}
                  onChange={e => setForm(p => ({...p, quantity: e.target.value}))} required /></div>
              <div><label className="label">Avg buy price (₹)</label>
                <input className="input" type="number" step="0.01" placeholder="2500" value={form.avgBuyPrice}
                  onChange={e => setForm(p => ({...p, avgBuyPrice: e.target.value}))} required /></div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm py-2">Add holding</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Holdings table */}
        <div className="lg:col-span-2 card">
          <div className="text-sm font-medium text-gray-700 mb-4">Holdings ({holdings.length})</div>
          {holdings.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No holdings yet. Add your first investment above.</div>
          ) : (
            <div className="space-y-2">
              {holdings.map(h => {
                const gain = parseFloat(h.gain_loss || 0);
                const gainPct = parseFloat(h.gain_loss_pct || 0);
                return (
                  <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{h.symbol}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{h.asset_type}</span>
                      </div>
                      <div className="text-xs text-gray-400 truncate">{h.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{formatINR(h.current_value || h.invested_value)}</div>
                      <div className={`text-xs flex items-center gap-0.5 justify-end ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {gain >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {gainPct.toFixed(2)}%
                      </div>
                    </div>
                    <button onClick={() => handleDelete(h.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie chart */}
        {pieData.length > 0 && (
          <div className="card">
            <div className="text-sm font-medium text-gray-700 mb-4">Asset allocation</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" nameKey="name">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 capitalize">{d.name.replace('_',' ')}</span>
                  </div>
                  <span className="font-medium text-gray-700">{formatINR(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
