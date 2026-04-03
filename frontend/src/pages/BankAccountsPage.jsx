import { useState, useEffect } from 'react';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import PremiumGate from '../components/PremiumGate';
import { Plus, Link2, Landmark, CreditCard, Wallet, RefreshCw, Trash2 } from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings Account', icon: Landmark },
  { value: 'current', label: 'Current Account', icon: Landmark },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'wallet', label: 'Digital Wallet', icon: Wallet },
  { value: 'demat', label: 'Demat Account', icon: Landmark },
  { value: 'loan', label: 'Loan Account', icon: Landmark },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const POPULAR_BANKS = ['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Yes Bank', 'IDFC First', 'AU Small Finance', 'Paytm Payments', 'PhonePe'];

export default function BankAccountsPage() {
  const { isPremium, loading: premLoading } = usePremium();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [setuPhone, setSetuPhone] = useState('');
  const [setuLoading, setSetuLoading] = useState(false);
  const [form, setForm] = useState({ accountName:'', bankName:'', accountType:'savings', accountNumberMasked:'', balance:'', creditLimit:'', color: COLORS[0] });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { if (isPremium) load(); }, [isPremium]);

  async function load() {
    try {
      const res = await api.get('/bank/accounts');
      setAccounts(res.data.accounts);
    } catch { } finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    await api.post('/bank/accounts', form);
    setShowAdd(false);
    setForm({ accountName:'', bankName:'', accountType:'savings', accountNumberMasked:'', balance:'', creditLimit:'', color: COLORS[0] });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Remove this account? Transactions will remain.')) return;
    await api.delete(`/bank/accounts/${id}`);
    load();
  }

  async function handleSetuLink() {
    setSetuLoading(true);
    try {
      const res = await api.post('/bank/setu/consent', { phone: setuPhone });
      if (res.data.redirectUrl) {
        window.open(res.data.redirectUrl, '_blank', 'width=480,height=700');
        alert('Complete bank linking in the popup. Your transactions will sync automatically.');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Bank linking unavailable. Use manual entry or CSV import.');
    } finally { setSetuLoading(false); }
  }

  const totalBalance = accounts.reduce((s, a) =>
    a.account_type === 'credit_card' ? s : s + parseFloat(a.balance || 0), 0);
  const totalDebt = accounts.filter(a => a.account_type === 'credit_card')
    .reduce((s, a) => s + parseFloat(a.balance || 0), 0);

  if (premLoading) return <div className="text-gray-400 text-sm">Loading…</div>;
  if (!isPremium) return <PremiumGate feature="Bank Account Linking" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-400 text-sm mt-0.5">Link accounts or add manually</p>
        </div>
        <button onClick={() => setShowAdd(p => !p)} className="btn-primary text-sm py-2 flex items-center gap-2">
          <Plus size={14} /> Add account
        </button>
      </div>

      {/* Net worth summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card">
          <div className="text-xs text-gray-400 mb-1">Total balance</div>
          <div className="text-xl font-semibold text-gray-900">{formatINR(totalBalance)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-400 mb-1">Credit card debt</div>
          <div className={`text-xl font-semibold ${totalDebt > 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatINR(totalDebt)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-400 mb-1">Net liquid assets</div>
          <div className={`text-xl font-semibold ${totalBalance - totalDebt >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatINR(totalBalance - totalDebt)}
          </div>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card space-y-4">
          {/* Setu AA linking */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={15} className="text-blue-600" />
              <div className="text-sm font-medium text-blue-800">Auto-link via Account Aggregator (Setu)</div>
            </div>
            <p className="text-xs text-blue-600 mb-3">Securely import all your bank transactions automatically. Powered by RBI-approved AA framework.</p>
            <div className="flex gap-2">
              <input className="input flex-1 text-sm" type="tel" placeholder="Mobile number linked to your bank"
                value={setuPhone} onChange={e => setSetuPhone(e.target.value)} />
              <button onClick={handleSetuLink} disabled={setuLoading || !setuPhone}
                className="btn-primary text-sm py-2 px-4 whitespace-nowrap">
                {setuLoading ? 'Opening…' : 'Link bank'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-100" />
            or add manually
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Account name</label>
                <input className="input" placeholder="HDFC Savings" value={form.accountName}
                  onChange={e => set('accountName', e.target.value)} required />
              </div>
              <div>
                <label className="label">Bank name</label>
                <input className="input" list="bank-list" placeholder="HDFC Bank" value={form.bankName}
                  onChange={e => set('bankName', e.target.value)} required />
                <datalist id="bank-list">
                  {POPULAR_BANKS.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>
              <div>
                <label className="label">Account type</label>
                <select className="input" value={form.accountType} onChange={e => set('accountType', e.target.value)}>
                  {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Last 4 digits (optional)</label>
                <input className="input" placeholder="XXXX1234" value={form.accountNumberMasked}
                  onChange={e => set('accountNumberMasked', e.target.value)} maxLength={20} />
              </div>
              <div>
                <label className="label">{form.account_type === 'credit_card' ? 'Outstanding balance' : 'Current balance'} (₹)</label>
                <input className="input" type="number" step="0.01" placeholder="45000" value={form.balance}
                  onChange={e => set('balance', e.target.value)} />
              </div>
              {form.accountType === 'credit_card' && (
                <div>
                  <label className="label">Credit limit (₹)</label>
                  <input className="input" type="number" placeholder="100000" value={form.creditLimit}
                    onChange={e => set('creditLimit', e.target.value)} />
                </div>
              )}
              <div>
                <label className="label">Card colour</label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => set('color', c)}
                      className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm py-2">Add account</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Account cards */}
      {loading ? (
        <div className="text-gray-400 text-sm">Loading accounts…</div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-12">
          <Landmark size={32} className="text-gray-200 mx-auto mb-3" />
          <div className="text-gray-500 text-sm">No accounts yet</div>
          <div className="text-gray-400 text-xs mt-1">Add a bank account to start tracking expenses</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {accounts.map(acc => {
            const Icon = ACCOUNT_TYPES.find(t => t.value === acc.account_type)?.icon || Landmark;
            const isCC = acc.account_type === 'credit_card';
            const utilisation = isCC && acc.credit_limit > 0
              ? Math.round((acc.balance / acc.credit_limit) * 100) : null;
            return (
              <div key={acc.id} className="card relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: acc.color }} />
                <div className="pl-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${acc.color}20` }}>
                        <Icon size={16} style={{ color: acc.color }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{acc.account_name}</div>
                        <div className="text-xs text-gray-400">{acc.bank_name}{acc.account_number_masked ? ` · ${acc.account_number_masked}` : ''}</div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(acc.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className={`text-xl font-bold ${isCC && acc.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatINR(acc.balance)}
                  </div>
                  {isCC && acc.credit_limit > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Used {utilisation}% of {formatINR(acc.credit_limit)}</span>
                        <span className={utilisation > 80 ? 'text-red-500' : 'text-gray-400'}>{utilisation}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${Math.min(utilisation, 100)}%`,
                          background: utilisation > 80 ? '#ef4444' : utilisation > 50 ? '#f59e0b' : '#10b981'
                        }} />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    {acc.transaction_count > 0 && <span>{acc.transaction_count} txns this month</span>}
                    {acc.last_synced && <span>Synced {new Date(acc.last_synced).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
