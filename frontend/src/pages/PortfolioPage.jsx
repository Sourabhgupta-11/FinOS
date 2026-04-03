import { useState, useEffect, useCallback } from 'react';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import PremiumGate from '../components/PremiumGate';
import { TrendingUp, TrendingDown, Plus, RefreshCw, Trash2, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const ASSET_TYPES = ['stock','mutual_fund','etf','gold','fd','ppf','nps','crypto','other'];
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#6b7280'];

export default function PortfolioPage() {
  const { isPremium, loading: premLoading } = usePremium();
  const [data, setData] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({
    symbol: '', name: '', assetType: 'stock',
    quantity: '', avgBuyPrice: '', exchange: 'NSE',
  });

  const fetchPortfolio = useCallback(async () => {
    setFetchLoading(true);
    setFetchError('');
    try {
      const res = await api.get('/portfolio');
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 402) {
        // handled by isPremium gate — don't show error
      } else {
        setFetchError(err.response?.data?.error || 'Failed to load portfolio');
      }
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if premium confirmed
    if (!premLoading && isPremium) {
      fetchPortfolio();
    } else if (!premLoading && !isPremium) {
      setFetchLoading(false);
    }
  }, [premLoading, isPremium, fetchPortfolio]);

  // Show gate immediately once we know plan
  if (premLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400 dark:text-gray-600 text-sm animate-pulse">Loading…</div>
      </div>
    );
  }
  if (!isPremium) return <PremiumGate requiredPlan="premium" feature="Portfolio Tracker" />;

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/portfolio', {
        ...form,
        quantity: parseFloat(form.quantity),
        avgBuyPrice: parseFloat(form.avgBuyPrice),
      });
      setForm({ symbol:'', name:'', assetType:'stock', quantity:'', avgBuyPrice:'', exchange:'NSE' });
      setShowForm(false);
      fetchPortfolio();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add holding');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this holding?')) return;
    await api.delete(`/portfolio/${id}`).catch(() => {});
    fetchPortfolio();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/portfolio/refresh');
      await fetchPortfolio();
    } catch { } finally { setRefreshing(false); }
  };

  const summary = data?.summary || {};
  const holdings = data?.holdings || [];
  const byType = data?.byAssetType || {};
  const pieData = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k.replace('_', ' '), value: Math.round(v) }));

  const gainColor = (n) => parseFloat(n) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Portfolio</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Track all investments with live NSE/BSE prices</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="btn-secondary flex items-center gap-1.5 text-sm py-2">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowForm(p => !p)}
            className="btn-primary flex items-center gap-1.5 text-sm py-2">
            <Plus size={13} /> Add holding
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="card border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm py-3">
          {fetchError} — <button onClick={fetchPortfolio} className="underline">retry</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Invested', value: formatINR(summary.totalInvested || 0) },
          { label: 'Current value', value: formatINR(summary.totalCurrent || 0) },
          { label: 'Gain / Loss', value: formatINR(summary.totalGain || 0), extra: gainColor(summary.totalGain) },
          { label: 'Returns', value: `${summary.totalGainPct || 0}%`, extra: gainColor(summary.totalGainPct) },
        ].map(({ label, value, extra }) => (
          <div key={label} className="card">
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</div>
            <div className={`text-xl font-semibold ${extra || 'text-gray-900 dark:text-white'}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add holding</div>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Symbol</label>
                <input className="input uppercase" placeholder="RELIANCE" value={form.symbol}
                  onChange={e => setForm(p => ({...p, symbol: e.target.value.toUpperCase()}))} required />
              </div>
              <div>
                <label className="label">Company name</label>
                <input className="input" placeholder="Reliance Industries" value={form.name}
                  onChange={e => setForm(p => ({...p, name: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Asset type</label>
                <select className="input" value={form.assetType}
                  onChange={e => setForm(p => ({...p, assetType: e.target.value}))}>
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Exchange</label>
                <select className="input" value={form.exchange}
                  onChange={e => setForm(p => ({...p, exchange: e.target.value}))}>
                  <option value="NSE">NSE</option>
                  <option value="BSE">BSE</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Quantity / Units</label>
                <input className="input" type="number" step="0.001" min="0.001" placeholder="10"
                  value={form.quantity} onChange={e => setForm(p => ({...p, quantity: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Avg buy price (₹)</label>
                <input className="input" type="number" step="0.01" min="0.01" placeholder="2500"
                  value={form.avgBuyPrice} onChange={e => setForm(p => ({...p, avgBuyPrice: e.target.value}))} required />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm py-2">Add holding</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {fetchLoading ? (
        <div className="card text-center py-10">
          <div className="text-gray-400 dark:text-gray-600 text-sm animate-pulse">Fetching portfolio…</div>
        </div>
      ) : holdings.length === 0 ? (
        <div className="card text-center py-14">
          <BarChart2 size={36} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">No holdings yet</div>
          <div className="text-gray-400 dark:text-gray-600 text-xs mt-1">Add your first investment above</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Holdings list */}
          <div className="lg:col-span-2 card">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Holdings ({holdings.length})
            </div>
            <div className="space-y-2">
              {holdings.map(h => {
                const gain = parseFloat(h.gain_loss || 0);
                const gainPct = parseFloat(h.gain_loss_pct || 0);
                return (
                  <div key={h.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{h.symbol}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded capitalize">
                          {h.asset_type?.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{h.name}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatINR(h.current_value || h.invested_value || 0)}
                      </div>
                      <div className={`text-xs flex items-center gap-0.5 justify-end ${gainColor(gain)}`}>
                        {gain >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {gainPct > 0 ? '+' : ''}{gainPct.toFixed(2)}%
                      </div>
                    </div>
                    <button onClick={() => handleDelete(h.id)}
                      className="p-1.5 text-gray-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Allocation chart */}
          {pieData.length > 0 && (
            <div className="card">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Asset mix</div>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    dataKey="value" nameKey="name" paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatINR(v)}
                    contentStyle={{ background: 'var(--tooltip-bg, #fff)', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{d.name}</span>
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{formatINR(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
