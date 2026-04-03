import { useState } from 'react';
import api, { formatINR } from '../utils/api';
import { TrendingUp, ShoppingBag, Calendar, Lightbulb } from 'lucide-react';

const PRESETS = [
  { label: 'MacBook Pro', amount: 150000 },
  { label: 'iPhone 15 Pro', amount: 130000 },
  { label: 'Bike / Scooter', amount: 100000 },
  { label: 'Europe trip', amount: 200000 },
  { label: 'New TV 65"', amount: 80000 },
];

export default function SimulatorPage() {
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
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (p) => setForm(prev => ({ ...prev, itemName: p.label, purchaseAmount: p.amount }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Decision Simulator</h1>
        <p className="text-gray-400 text-sm mt-0.5">See the true cost of any purchase decision</p>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card border-red-100 bg-red-50">
              <div className="flex items-center gap-2 text-red-600 text-xs font-medium mb-3">
                <ShoppingBag size={14} />
                If you buy {form.itemName || 'this'}
              </div>
              <div className="text-3xl font-bold text-red-700">{result.monthsDelay} months</div>
              <div className="text-sm text-red-600 mt-1">savings goal delayed</div>
            </div>

            <div className="card border-green-100 bg-green-50">
              <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-3">
                <TrendingUp size={14} />
                If you invest instead
              </div>
              <div className="text-3xl font-bold text-green-700">{formatINR(result.opportunityValue)}</div>
              <div className="text-sm text-green-600 mt-1">wealth in {form.timeHorizonYears} years ({result.ratio}x return)</div>
            </div>
          </div>

          <div className="card flex items-start gap-3">
            <Lightbulb size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-800 mb-1">AI verdict</div>
              <div className="text-sm text-gray-600 leading-relaxed">{result.verdict}</div>
            </div>
          </div>

          <div className="card">
            <div className="text-sm font-medium text-gray-700 mb-3">Breakdown</div>
            <div className="space-y-2 text-sm">
              {[
                ['Purchase amount', formatINR(parseFloat(form.purchaseAmount))],
                ['Your monthly surplus', formatINR(parseFloat(form.monthlySurplus))],
                ['Time to save up', `${result.monthsDelay} months`],
                ['Expected annual return', `${form.expectedReturn}%`],
                ['Investment horizon', `${form.timeHorizonYears} years`],
                ['Opportunity cost', formatINR(result.opportunityValue)],
                ['Growth multiplier', `${result.ratio}x`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-900">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-secondary w-full" onClick={() => setResult(null)}>
            Simulate another decision
          </button>
        </div>
      )}

      {!result && (
        <>
          {/* Presets */}
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Quick presets</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600
                             hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                  {p.label} ({formatINR(p.amount)})
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">What are you buying?</label>
                <input className="input" type="text" placeholder="e.g. MacBook Pro, iPhone, Trip to Europe"
                  value={form.itemName} onChange={e => set('itemName', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Purchase amount (₹)</label>
                  <input className="input" type="number" placeholder="150000"
                    value={form.purchaseAmount} onChange={e => set('purchaseAmount', e.target.value)} required min="1" />
                </div>
                <div>
                  <label className="label">Monthly surplus (₹)</label>
                  <input className="input" type="number" placeholder="20000"
                    value={form.monthlySurplus} onChange={e => set('monthlySurplus', e.target.value)} required min="1" />
                </div>
                <div>
                  <label className="label">Expected return (%/year)</label>
                  <input className="input" type="number" step="0.5" min="1" max="30"
                    value={form.expectedReturn} onChange={e => set('expectedReturn', e.target.value)} />
                </div>
                <div>
                  <label className="label">Time horizon (years)</label>
                  <select className="input" value={form.timeHorizonYears} onChange={e => set('timeHorizonYears', e.target.value)}>
                    {[1,2,3,5,7,10,15,20].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Simulating...' : 'Simulate impact →'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
