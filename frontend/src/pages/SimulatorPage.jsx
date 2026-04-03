import { useState } from 'react';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import PremiumGate from '../components/PremiumGate';
import { ShoppingBag, TrendingUp, Lightbulb } from 'lucide-react';

const PRESETS = [
  { label: 'MacBook Pro', amount: 150000 },
  { label: 'iPhone 15 Pro', amount: 130000 },
  { label: 'Bike / Scooter', amount: 100000 },
  { label: 'Europe trip', amount: 200000 },
  { label: 'New TV 65"', amount: 80000 },
];

export default function SimulatorPage() {
  const { isPro, loading: premLoading } = usePremium();
  const [form, setForm] = useState({
    itemName: '', purchaseAmount: '', monthlySurplus: '',
    expectedReturn: 12, timeHorizonYears: 5,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/finance/simulate', {
        ...form,
        purchaseAmount: parseFloat(form.purchaseAmount),
        monthlySurplus: parseFloat(form.monthlySurplus),
        expectedReturn: parseFloat(form.expectedReturn),
        timeHorizonYears: parseInt(form.timeHorizonYears),
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Simulation failed. Check your inputs.');
    } finally { setLoading(false); }
  };

  if (premLoading) return <div className="text-gray-400 text-sm animate-pulse">Loading…</div>;
  if (!isPro) return <PremiumGate requiredPlan="pro" feature="Decision Simulator" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Decision Simulator</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">See the true long-term cost of any purchase</p>
      </div>

      {result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-medium mb-3">
                <ShoppingBag size={13} /> If you buy {form.itemName || 'this'}
              </div>
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">{result.monthsDelay}</div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-1">months savings delay</div>
            </div>
            <div className="card border-green-100 dark:border-green-900/40 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-medium mb-3">
                <TrendingUp size={13} /> If you invest instead
              </div>
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                {formatINR(result.opportunityValue)}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                in {form.timeHorizonYears} years ({result.ratio}x growth)
              </div>
            </div>
          </div>
          <div className="card flex items-start gap-3">
            <Lightbulb size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.verdict}</div>
          </div>
          <button className="btn-secondary w-full text-sm" onClick={() => setResult(null)}>
            Simulate another decision
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => set('purchaseAmount', p.amount) || set('itemName', p.label)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700
                           text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-600
                           hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                {p.label} ({formatINR(p.amount)})
              </button>
            ))}
          </div>
          <div className="card">
            {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-lg mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">What are you buying?</label>
                <input className="input" placeholder="e.g. MacBook Pro, trip to Europe…"
                  value={form.itemName} onChange={e => set('itemName', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Purchase amount (₹)</label>
                  <input className="input" type="number" min="1" placeholder="150000"
                    value={form.purchaseAmount} onChange={e => set('purchaseAmount', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Monthly surplus (₹)</label>
                  <input className="input" type="number" min="1" placeholder="20000"
                    value={form.monthlySurplus} onChange={e => set('monthlySurplus', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Expected return (%/year)</label>
                  <input className="input" type="number" step="0.5" min="1" max="30"
                    value={form.expectedReturn} onChange={e => set('expectedReturn', e.target.value)} />
                </div>
                <div>
                  <label className="label">Time horizon</label>
                  <select className="input" value={form.timeHorizonYears} onChange={e => set('timeHorizonYears', e.target.value)}>
                    {[1,2,3,5,7,10,15,20].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Simulating…' : 'Simulate impact →'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
