import { useState } from 'react';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import PremiumGate from '../components/PremiumGate';
import { Calculator, TrendingDown, CheckCircle, Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const FY_OPTIONS = ['2024-25', '2023-24', '2022-23'];

export default function TaxCalculatorPage() {
  const { isPremium, loading: premLoading } = usePremium();
  const [form, setForm] = useState({
    financialYear: '2024-25',
    grossSalary: '', otherIncome: '',
    hraReceived: '', rentPaid: '', isMetroCity: false,
    lta: '',
    deduction80C: '', deduction80D: '', deduction80CCD: '',
    deduction80TTA: '', homeLoanInterest: '', otherDeductions: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === 'boolean' ? v : (v === '' ? 0 : parseFloat(v) || v)])
      );
      const res = await api.post('/tax/calculate', payload);
      setResult(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed');
    } finally { setLoading(false); }
  }

  if (premLoading) return <div className="text-gray-400 text-sm">Loading…</div>;
  if (!isPremium) return <PremiumGate feature="Tax Calculator" />;

  const chartData = result ? [
    { name: 'Old regime', tax: result.oldRegime.tax, fill: '#ef4444' },
    { name: 'New regime', tax: result.newRegime.tax, fill: '#3b82f6' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Tax Calculator</h1>
        <p className="text-gray-400 text-sm mt-0.5">Old vs New regime — FY 2024-25 slabs with 87A rebate, surcharge & cess</p>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Recommendation banner */}
          <div className={`card flex items-center gap-4 ${result.recommended === 'new' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
            <CheckCircle size={24} className={result.recommended === 'new' ? 'text-blue-500' : 'text-green-500'} />
            <div>
              <div className="font-semibold text-gray-900">
                {result.recommended === 'new' ? 'New regime is better for you' : 'Old regime is better for you'}
              </div>
              <div className="text-sm text-gray-600">
                You save {formatINR(result.taxSaved)} by choosing the {result.recommended} regime
              </div>
            </div>
          </div>

          {/* Side by side comparison */}
          <div className="grid grid-cols-2 gap-4">
            {['oldRegime', 'newRegime'].map((key) => {
              const r = result[key];
              const label = key === 'oldRegime' ? 'Old Regime' : 'New Regime';
              const isRec = result.recommended === (key === 'oldRegime' ? 'old' : 'new');
              return (
                <div key={key} className={`card ${isRec ? 'border-2 border-blue-400' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-gray-700">{label}</div>
                    {isRec && <span className="badge-info text-xs">Recommended</span>}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-3">{formatINR(r.tax)}</div>
                  <div className="space-y-1.5 text-xs">
                    {[
                      ['Gross income', formatINR(result.grossIncome)],
                      ['Deductions', formatINR(r.totalDeductions)],
                      ['Taxable income', formatINR(r.taxableIncome)],
                      ['Effective rate', `${r.effectiveRate}%`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between">
                        <span className="text-gray-400">{l}</span>
                        <span className="font-medium text-gray-700">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bar chart */}
          <div className="card">
            <div className="text-sm font-medium text-gray-700 mb-4">Tax comparison</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barSize={56}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => [formatINR(v), 'Tax payable']} />
                <Bar dataKey="tax" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Deduction breakdown */}
          <div className="card">
            <div className="text-sm font-medium text-gray-700 mb-3">Deduction breakdown</div>
            <div className="space-y-2">
              {result.deductionBreakdown.map((d) => (
                <div key={d.label} className="flex items-center gap-3 text-xs">
                  <div className="flex-1 text-gray-600">{d.label}</div>
                  <div className="w-20 text-right text-gray-700 font-medium">{formatINR(d.oldRegime)}</div>
                  <div className="w-20 text-right text-blue-600 font-medium">{formatINR(d.newRegime)}</div>
                </div>
              ))}
              <div className="flex items-center gap-3 text-xs text-gray-400 pt-1 border-t border-gray-100">
                <div className="flex-1" />
                <div className="w-20 text-right">Old</div>
                <div className="w-20 text-right">New</div>
              </div>
            </div>
          </div>

          {/* Tips */}
          {result.tips?.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Lightbulb size={15} className="text-amber-500" /> Tax saving tips
              </div>
              <div className="space-y-2">
                {result.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-amber-500 mt-0.5">→</span> {tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setResult(null)} className="btn-secondary w-full text-sm">
            Recalculate
          </button>
        </div>
      )}

      {!result && (
        <div className="card">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Financial year</label>
                <select className="input" value={form.financialYear} onChange={e => set('financialYear', e.target.value)}>
                  {FY_OPTIONS.map(y => <option key={y} value={y}>FY {y}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Gross salary (annual ₹)</label>
                <input className="input" type="number" placeholder="1200000" value={form.grossSalary}
                  onChange={e => set('grossSalary', e.target.value)} required />
              </div>
              <div>
                <label className="label">Other income (interest, rent, etc)</label>
                <input className="input" type="number" placeholder="0" value={form.otherIncome}
                  onChange={e => set('otherIncome', e.target.value)} />
              </div>
              <div>
                <label className="label">HRA received (annual ₹)</label>
                <input className="input" type="number" placeholder="240000" value={form.hraReceived}
                  onChange={e => set('hraReceived', e.target.value)} />
              </div>
              <div>
                <label className="label">Rent paid (annual ₹)</label>
                <input className="input" type="number" placeholder="180000" value={form.rentPaid}
                  onChange={e => set('rentPaid', e.target.value)} />
              </div>
              <div>
                <label className="label">LTA (annual ₹)</label>
                <input className="input" type="number" placeholder="0" value={form.lta}
                  onChange={e => set('lta', e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="metro" checked={form.isMetroCity}
                onChange={e => set('isMetroCity', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="metro" className="text-sm text-gray-700">I live in a metro city (Delhi/Mumbai/Chennai/Kolkata)</label>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-3">Deductions (Old regime only)</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['deduction80C', '80C — ELSS/PPF/LIC (max ₹1.5L)', '150000'],
                  ['deduction80D', '80D — Health insurance (max ₹75k)', '25000'],
                  ['deduction80CCD', 'NPS 80CCD(1B) (max ₹50k)', '50000'],
                  ['deduction80TTA', '80TTA — Savings interest (max ₹10k)', '10000'],
                  ['homeLoanInterest', 'Home loan interest Sec 24b (max ₹2L)', '0'],
                  ['otherDeductions', 'Other deductions', '0'],
                ].map(([key, label, placeholder]) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input className="input" type="number" placeholder={placeholder} value={form[key]}
                      onChange={e => set(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              <Calculator size={16} />
              {loading ? 'Calculating…' : 'Calculate tax →'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
