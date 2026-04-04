import { useState } from 'react';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import PremiumGate from '../components/PremiumGate';
import { Calculator, CheckCircle, Lightbulb, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TaxCalculatorPage() {
  const { isPro, loading: premLoading } = usePremium();
  const [form, setForm] = useState({
    financialYear:'2024-25', grossSalary:'', otherIncome:'',
    hraReceived:'', rentPaid:'', isMetroCity:false, lta:'',
    deduction80C:'', deduction80D:'', deduction80CCD:'',
    deduction80TTA:'', homeLoanInterest:'', otherDeductions:'',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === 'boolean' ? v : (v === '' ? 0 : parseFloat(v) || v)])
      );
      const res = await api.post('/tax/calculate', payload);
      setResult(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError(err.response?.data?.error || 'Calculation failed'); }
    finally { setLoading(false); }
  }

  if (premLoading) return <div className="text-gray-400 animate-pulse text-sm">Loading…</div>;
  if (!isPro) return <PremiumGate requiredPlan="pro" feature="Tax Calculator" />;

  const chartData = result ? [
    { name: 'Old regime', tax: result.oldRegime.tax, fill: result.recommended === 'old' ? '#10b981' : '#ef4444' },
    { name: 'New regime', tax: result.newRegime.tax, fill: result.recommended === 'new' ? '#10b981' : '#3b82f6' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Tax Calculator</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">FY 2024-25 · Old vs New regime with 87A rebate, surcharge & cess</p>
      </div>

      {result && (
        <div className="space-y-4 page-enter">
          {/* Recommendation */}
          <div className={`card flex items-center gap-4 ${result.recommended === 'new' ? 'border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-900/20' : 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/20'}`}>
            <CheckCircle size={24} className={result.recommended === 'new' ? 'text-blue-500' : 'text-emerald-500'} />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {result.recommended === 'new' ? 'New regime' : 'Old regime'} saves you more
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Save {formatINR(result.taxSaved)} by choosing the {result.recommended} tax regime
              </div>
            </div>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {['oldRegime','newRegime'].map(key => {
              const r = result[key];
              const isRec = result.recommended === (key === 'oldRegime' ? 'old' : 'new');
              return (
                <div key={key} className={`card ${isRec ? 'border-2 border-blue-400 dark:border-blue-500' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {key === 'oldRegime' ? 'Old Regime' : 'New Regime'}
                    </div>
                    {isRec && <span className="badge-info text-xs">Recommended</span>}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums mb-3">{formatINR(r.tax)}</div>
                  <div className="space-y-1.5 text-xs">
                    {[
                      ['Gross income', formatINR(result.grossIncome)],
                      ['Deductions', formatINR(r.totalDeductions)],
                      ['Taxable income', formatINR(r.taxableIncome)],
                      ['Effective rate', `${r.effectiveRate}%`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between">
                        <span className="text-gray-400 dark:text-gray-500">{l}</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart */}
          <div className="card">
            <div className="section-title">Tax comparison</div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={chartData} barSize={56}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => [formatINR(v), 'Tax payable']}
                  contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="tax" radius={[6,6,0,0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Deductions table */}
          <div className="card">
            <div className="section-title">Deduction breakdown</div>
            <div className="space-y-2">
              {result.deductionBreakdown.filter(d => d.oldRegime > 0 || d.newRegime > 0).map((d) => (
                <div key={d.label} className="flex items-center gap-3 text-xs">
                  <div className="flex-1 text-gray-600 dark:text-gray-400">{d.label}</div>
                  <div className="w-24 text-right font-medium text-gray-700 dark:text-gray-300">{formatINR(d.oldRegime)}</div>
                  <div className="w-24 text-right font-medium text-blue-600 dark:text-blue-400">{formatINR(d.newRegime)}</div>
                </div>
              ))}
              <div className="flex items-center gap-3 text-xs text-gray-300 dark:text-gray-600 pt-1 border-t border-gray-100 dark:border-gray-800">
                <div className="flex-1" />
                <div className="w-24 text-right">Old</div>
                <div className="w-24 text-right">New</div>
              </div>
            </div>
          </div>

          {/* Tips */}
          {result.tips?.length > 0 && (
            <div className="card">
              <div className="section-title flex items-center gap-2"><Lightbulb size={13} className="text-amber-500" /> Tax saving tips</div>
              <div className="space-y-2">
                {result.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-amber-500 flex-shrink-0 mt-0.5">→</span> {tip}
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => setResult(null)} className="btn-secondary w-full text-sm">Recalculate</button>
        </div>
      )}

      {!result && (
        <div className="card">
          {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-xl mb-4 border border-red-100 dark:border-red-800/40">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Financial year</label>
                <select className="input" value={form.financialYear} onChange={e => set('financialYear', e.target.value)}>
                  {['2024-25','2023-24','2022-23'].map(y => <option key={y} value={y}>FY {y}</option>)}
                </select></div>
              <div><label className="label">Gross salary (annual ₹)</label>
                <input className="input" type="number" placeholder="1200000" value={form.grossSalary} onChange={e => set('grossSalary', e.target.value)} required /></div>
              <div><label className="label">Other income (₹)</label>
                <input className="input" type="number" placeholder="0" value={form.otherIncome} onChange={e => set('otherIncome', e.target.value)} /></div>
              <div><label className="label">HRA received (annual ₹)</label>
                <input className="input" type="number" placeholder="240000" value={form.hraReceived} onChange={e => set('hraReceived', e.target.value)} /></div>
              <div><label className="label">Rent paid (annual ₹)</label>
                <input className="input" type="number" placeholder="180000" value={form.rentPaid} onChange={e => set('rentPaid', e.target.value)} /></div>
              <div><label className="label">LTA (annual ₹)</label>
                <input className="input" type="number" placeholder="0" value={form.lta} onChange={e => set('lta', e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2.5">
              <input type="checkbox" id="metro" checked={form.isMetroCity} onChange={e => set('isMetroCity', e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="metro" className="text-sm text-gray-700 dark:text-gray-300">Metro city (Delhi/Mumbai/Chennai/Kolkata)</label>
            </div>
            <div>
              <div className="section-title">Deductions (Old regime only)</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['deduction80C','80C — ELSS/PPF/LIC (max ₹1.5L)','150000'],
                  ['deduction80D','80D — Health insurance (max ₹75k)','25000'],
                  ['deduction80CCD','NPS 80CCD(1B) (max ₹50k)','50000'],
                  ['deduction80TTA','80TTA — Savings interest (max ₹10k)','10000'],
                  ['homeLoanInterest','Home loan interest Sec 24b (max ₹2L)','0'],
                  ['otherDeductions','Other deductions','0'],
                ].map(([key, label, placeholder]) => (
                  <div key={key}><label className="label">{label}</label>
                    <input className="input" type="number" placeholder={placeholder} value={form[key]} onChange={e => set(key, e.target.value)} /></div>
                ))}
              </div>
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              <Calculator size={16} />{loading ? 'Calculating…' : 'Calculate tax →'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
