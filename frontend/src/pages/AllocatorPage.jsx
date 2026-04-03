import { useState } from 'react';
import api, { formatINR } from '../utils/api';
import { CheckCircle, AlertTriangle, AlertCircle, Info, Calendar } from 'lucide-react';

const ALERT_ICONS = { success: CheckCircle, warning: AlertTriangle, danger: AlertCircle, info: Info };
const ALERT_STYLES = {
  success: 'bg-green-50 text-green-800',
  warning: 'bg-yellow-50 text-yellow-800',
  danger:  'bg-red-50 text-red-800',
  info:    'bg-blue-50 text-blue-800',
};

const ALLOC_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

function AllocationBar({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ALLOC_COLORS[i] }} />
          <div className="flex-1 text-sm text-gray-700">{item.label}</div>
          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.pct}%`, background: ALLOC_COLORS[i] }} />
          </div>
          <div className="text-sm font-medium text-gray-900 w-24 text-right">{formatINR(item.amount)}</div>
          <div className="text-xs text-gray-400 w-8 text-right">{item.pct}%</div>
        </div>
      ))}
    </div>
  );
}

export default function AllocatorPage() {
  const [form, setForm] = useState({
    salary: '', age: '', riskLevel: 'medium', goal: 'wealth',
    monthlyExpenses: '', hasInsurance: false, emergencyFundMonths: 0,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/finance/allocate', {
        ...form,
        salary: parseFloat(form.salary),
        age: parseInt(form.age),
        monthlyExpenses: form.monthlyExpenses ? parseFloat(form.monthlyExpenses) : undefined,
        emergencyFundMonths: parseInt(form.emergencyFundMonths),
      });
      setResult(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const allocItems = result ? [
    { label: 'SIP / Mutual funds', amount: result.allocation.sip, pct: result.allocation.percentages.sip },
    { label: 'Emergency fund', amount: result.allocation.emergencyFund, pct: result.allocation.percentages.emergencyFund },
    { label: 'Direct stocks', amount: result.allocation.stocks, pct: result.allocation.percentages.stocks },
    { label: 'Short-term savings', amount: result.allocation.savings, pct: result.allocation.percentages.savings },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Salary Allocator</h1>
        <p className="text-gray-400 text-sm mt-0.5">Get a smart breakdown of where your money should go</p>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Health score */}
          <div className="card flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
              style={{ background: result.healthScore >= 75 ? '#10b981' : result.healthScore >= 50 ? '#3b82f6' : '#f59e0b' }}>
              {result.healthScore}
            </div>
            <div>
              <div className="font-semibold text-gray-900">Financial health score: {result.healthScore}/100</div>
              <div className="text-sm text-gray-400 mt-0.5">Based on your current salary, savings rate, and goals</div>
            </div>
          </div>

          {/* Allocation */}
          <div className="card">
            <div className="text-sm font-medium text-gray-700 mb-4">Monthly allocation from ₹{parseFloat(result.allocation.surplus).toLocaleString('en-IN')} surplus</div>
            <AllocationBar items={allocItems} />
          </div>

          {/* Alerts */}
          <div className="card">
            <div className="text-sm font-medium text-gray-700 mb-3">Recommendations</div>
            <div className="space-y-2">
              {result.alerts.map((a, i) => {
                const Icon = ALERT_ICONS[a.type] || Info;
                return (
                  <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm ${ALERT_STYLES[a.type]}`}>
                    <Icon size={15} className="flex-shrink-0 mt-0.5" />
                    {a.message}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roadmap */}
          <div className="card">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
              <Calendar size={16} />
              Your 6-month roadmap
            </div>
            <div className="space-y-0">
              {result.roadmap.map((step, i) => (
                <div key={i} className="flex gap-4 pb-4">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-medium flex items-center justify-center flex-shrink-0">
                      {step.month}
                    </div>
                    {i < result.roadmap.length - 1 && (
                      <div className="w-0.5 bg-blue-100 flex-1 mt-1" style={{ minHeight: 20 }} />
                    )}
                  </div>
                  <div className="text-sm text-gray-700 pt-1 pb-2">{step.action}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="card">
        <div className="text-sm font-medium text-gray-700 mb-4">{result ? 'Update your profile' : 'Enter your details'}</div>
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monthly salary (₹)</label>
              <input className="input" type="number" placeholder="80000" value={form.salary}
                onChange={e => set('salary', e.target.value)} required min="10000" />
            </div>
            <div>
              <label className="label">Age</label>
              <input className="input" type="number" placeholder="24" value={form.age}
                onChange={e => set('age', e.target.value)} required min="18" max="80" />
            </div>
            <div>
              <label className="label">Risk level</label>
              <select className="input" value={form.riskLevel} onChange={e => set('riskLevel', e.target.value)}>
                <option value="low">Low — safety first</option>
                <option value="medium">Medium — balanced</option>
                <option value="high">High — growth focused</option>
              </select>
            </div>
            <div>
              <label className="label">Primary goal</label>
              <select className="input" value={form.goal} onChange={e => set('goal', e.target.value)}>
                <option value="wealth">Wealth creation</option>
                <option value="travel">Travel & lifestyle</option>
                <option value="house">Buy a house</option>
                <option value="retire">Early retirement</option>
              </select>
            </div>
            <div>
              <label className="label">Monthly expenses (₹)</label>
              <input className="input" type="number" placeholder="Auto-calculated" value={form.monthlyExpenses}
                onChange={e => set('monthlyExpenses', e.target.value)} />
            </div>
            <div>
              <label className="label">Emergency fund (months)</label>
              <select className="input" value={form.emergencyFundMonths} onChange={e => set('emergencyFundMonths', e.target.value)}>
                {[0,1,2,3,4,5,6,9,12].map(m => <option key={m} value={m}>{m} {m === 0 ? '(none)' : m >= 6 ? '(healthy)' : 'months'}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="insurance" checked={form.hasInsurance}
              onChange={e => set('hasInsurance', e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="insurance" className="text-sm text-gray-700">I have term life insurance</label>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Calculating...' : result ? 'Recalculate' : 'Calculate my allocation →'}
          </button>
        </form>
      </div>
    </div>
  );
}
