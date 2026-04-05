import { useState, useEffect } from 'react';
import { usePremium } from '../hooks/usePremium';
import api, { formatINR, formatDate } from '../utils/api';
import { Crown, Zap, Check, X, Sparkles, AlertTriangle, Calendar, RefreshCw } from 'lucide-react';

const PLANS = [
  {
    key: 'free', name: 'Free', priceLabel: '₹0', period: 'forever', icon: null,
    color: 'text-gray-500 dark:text-gray-400', aiMsg: '3 messages/day',
    features: [
      { t: 'Salary Allocator', ok: true }, { t: 'AI Advisor (3 msg/day)', ok: true },
      { t: 'Health Score', ok: true },      { t: 'Net Worth Dashboard', ok: true },
      { t: 'Assets & Goals', ok: true },    { t: 'Decision Simulator', ok: false },
      { t: 'Allocation History', ok: false }, { t: 'Expense Tracker', ok: false },
      { t: 'Bank Accounts', ok: false },    { t: 'Tax Calculator', ok: false },
      { t: 'Portfolio Tracker', ok: false },
    ],
  },
  {
    key: 'pro', name: 'Pro', priceLabel: '₹99', period: '/month', icon: Zap,
    color: 'text-blue-600 dark:text-blue-400', aiMsg: '50 messages/day',
    borderClass: 'border-2 border-blue-400 dark:border-blue-500',
    badge: 'Best Value', badgeCls: 'bg-blue-600 text-white',
    features: [
      { t: 'Everything in Free', ok: true },  { t: 'AI Advisor (50 msg/day)', ok: true },
      { t: 'Decision Simulator', ok: true },  { t: 'Allocation History', ok: true },
      { t: 'Push Notifications', ok: true },  { t: 'Chat History', ok: true },
      { t: 'Expense Tracker', ok: false },    { t: 'Bank Account Linking', ok: false },
      { t: 'Tax Calculator', ok: false },     { t: 'Portfolio Tracker', ok: false },
    ],
  },
  {
    key: 'premium', name: 'Premium', priceLabel: '₹199', period: '/month', icon: Crown,
    color: 'text-amber-500 dark:text-amber-400', aiMsg: 'Unlimited',
    borderClass: 'border-2 border-amber-400 dark:border-amber-500',
    badge: 'All Features', badgeCls: 'bg-amber-500 text-white',
    features: [
      { t: 'Everything in Pro', ok: true },   { t: 'Unlimited AI Advisor', ok: true },
      { t: 'Expense Tracker + CSV', ok: true },{ t: 'Bank Account Linking', ok: true },
      { t: 'Tax Calculator', ok: true },       { t: 'Portfolio Tracker (live)', ok: true },
      { t: 'Budget Manager', ok: true },       { t: 'All Notifications', ok: true },
    ],
  },
];

const PLAN_ORDER = { free: 0, pro: 1, premium: 2 };

export default function SubscriptionPage() {
  const { subscription, plan: currentPlan, loading } = usePremium();
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [tab, setTab] = useState('plans'); // 'plans' | 'manage'

  useEffect(() => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    document.body.appendChild(s);
    return () => { try { document.body.removeChild(s); } catch {} };
  }, []);

  // Auto-switch to manage tab if already paid
  useEffect(() => {
    if (!loading && currentPlan !== 'free') setTab('manage');
  }, [loading, currentPlan]);

  const upgrade = async (planKey) => {
    if (planKey === 'free' || planKey === currentPlan) return;
    if (PLAN_ORDER[planKey] < PLAN_ORDER[currentPlan]) return;
    setError(''); setSuccess(''); setProcessing(planKey);
    try {
      const res = await api.post('/subscription', { planType: planKey });
      if (res.data.demo) {
        setSuccess(`✓ ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} activated (demo mode).`);
        setProcessing(null);
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      if (!window.Razorpay) { setError('Payment gateway not loaded. Refresh and try again.'); setProcessing(null); return; }
      const rzp = new window.Razorpay({
        key: res.data.keyId,
        subscription_id: res.data.subscriptionId,
        name: 'FinOS',
        description: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} — ₹${planKey === 'pro' ? '99' : '199'}/month`,
        image: '/logo.svg',
        theme: { color: planKey === 'pro' ? '#2563eb' : '#f59e0b' },
        handler: () => { setSuccess('✓ Payment successful! Activating your plan…'); setProcessing(null); setTimeout(() => window.location.reload(), 2500); },
        modal: { ondismiss: () => setProcessing(null) },
      });
      rzp.on('payment.failed', () => { setError('Payment failed. Please try again.'); setProcessing(null); });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start payment.');
      setProcessing(null);
    }
  };

  const cancel = async () => {
    try {
      await api.delete('/subscription');
      setSuccess('Subscription cancelled. Access continues until billing period ends.');
      setShowCancel(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) { setError(err.response?.data?.error || 'Cancel failed.'); }
  };

  if (loading) return <div className="text-gray-400 animate-pulse text-sm">Loading…</div>;

  const periodEnd = subscription?.current_period_end ? formatDate(subscription.current_period_end) : null;
  const periodStart = subscription?.current_period_start ? formatDate(subscription.current_period_start) : null;
  const planInfo = PLANS.find(p => p.key === currentPlan);
  const PlanIcon = planInfo?.icon;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Subscription</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Manage your FinOS plan</p>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {['plans','manage'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium capitalize transition-all
                ${tab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
              {t === 'manage' ? 'My Plan' : 'Plans'}
            </button>
          ))}
        </div>
      </div>

      {error   && <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}
      {success && <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl">{success}</div>}

      {/* ── MY PLAN tab ─────────────────────────────────────────────────── */}
      {tab === 'manage' && (
        <div className="space-y-4">
          <div className={`card ${currentPlan === 'premium' ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20' : currentPlan === 'pro' ? 'border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
            <div className="flex items-center gap-3 mb-4">
              {PlanIcon ? <PlanIcon size={22} className={planInfo?.color} /> : <div className="w-5 h-5" />}
              <div>
                <div className="font-bold text-gray-900 dark:text-white">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {planInfo?.aiMsg} AI messages · {planInfo?.priceLabel}{planInfo?.period !== 'forever' ? planInfo?.period : ''}
                </div>
              </div>
              {currentPlan !== 'free' && !subscription?.cancel_at_period_end && (
                <span className="ml-auto badge-success text-xs">Active</span>
              )}
              {subscription?.cancel_at_period_end && (
                <span className="ml-auto badge-warning text-xs">Cancelling</span>
              )}
            </div>

            {currentPlan !== 'free' && (
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                {periodStart && (
                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <Calendar size={14} className="text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-400">Billing started</div>
                      <div className="font-medium text-gray-900 dark:text-white">{periodStart}</div>
                    </div>
                  </div>
                )}
                {periodEnd && (
                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <RefreshCw size={14} className="text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-400">{subscription?.cancel_at_period_end ? 'Access until' : 'Next renewal'}</div>
                      <div className="font-medium text-gray-900 dark:text-white">{periodEnd}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {currentPlan !== 'premium' && (
                <button onClick={() => setTab('plans')} className="btn-primary text-sm py-2 flex items-center gap-1.5">
                  <Crown size={13} /> {currentPlan === 'pro' ? 'Upgrade to Premium' : 'Upgrade Plan'}
                </button>
              )}
              {currentPlan !== 'free' && !subscription?.cancel_at_period_end && (
                <button onClick={() => setShowCancel(true)} className="btn-secondary text-sm py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                  Cancel subscription
                </button>
              )}
              {subscription?.cancel_at_period_end && (
                <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/40">
                  Your subscription is set to cancel on {periodEnd}. Contact support to reactivate.
                </div>
              )}
            </div>
          </div>

          {/* Cancel confirmation */}
          {showCancel && (
            <div className="card border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-red-900 dark:text-red-200 text-sm">Confirm cancellation</div>
                  <div className="text-xs text-red-700 dark:text-red-300 mt-1 leading-relaxed">
                    You'll keep {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} access until {periodEnd || 'end of billing period'}.
                    After that, your account moves to the Free plan.
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={cancel} className="text-sm px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">Yes, cancel</button>
                    <button onClick={() => setShowCancel(false)} className="btn-secondary text-sm py-2">Keep subscription</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* What's included */}
          <div className="card">
            <div className="section-title">What's included in your plan</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(PLANS.find(p => p.key === currentPlan)?.features || []).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {f.ok ? <Check size={13} className="text-emerald-500 flex-shrink-0" /> : <X size={13} className="text-gray-200 dark:text-gray-700 flex-shrink-0" />}
                  <span className={f.ok ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}>{f.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PLANS tab ───────────────────────────────────────────────────── */}
      {tab === 'plans' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((p) => {
              const isCurrent  = currentPlan === p.key;
              const canUpgrade = PLAN_ORDER[p.key] > PLAN_ORDER[currentPlan];
              const Icon = p.icon;
              return (
                <div key={p.key} className={`card relative flex flex-col ${p.borderClass || ''}`}>
                  {p.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap ${p.badgeCls}`}>{p.badge}</div>
                  )}
                  <div className="mb-3 pt-1">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {Icon && <Icon size={14} className={p.color} />}
                      <span className={`text-sm font-bold ${p.color}`}>{p.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{p.priceLabel}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{p.period}</span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">AI: {p.aiMsg}</div>
                  </div>
                  <div className="flex-1 space-y-1.5 mb-4">
                    {p.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {f.ok ? <Check size={11} className="text-emerald-500 flex-shrink-0" /> : <X size={11} className="text-gray-200 dark:text-gray-700 flex-shrink-0" />}
                        <span className={f.ok ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}>{f.t}</span>
                      </div>
                    ))}
                  </div>
                  {isCurrent ? (
                    <div className="text-center text-sm font-medium text-gray-400 dark:text-gray-500 py-2.5 border border-gray-100 dark:border-gray-800 rounded-xl">✓ Current plan</div>
                  ) : canUpgrade ? (
                    <button onClick={() => upgrade(p.key)} disabled={!!processing}
                      className={`btn-primary w-full flex items-center justify-center gap-1.5 text-sm ${p.key === 'premium' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}>
                      {Icon && <Icon size={13} />}
                      {processing === p.key ? 'Opening…' : `Get ${p.name}`}
                    </button>
                  ) : (
                    <div className="text-center text-xs text-gray-300 dark:text-gray-600 py-2">—</div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400 dark:text-gray-600">
            <span className="flex items-center gap-1"><Sparkles size={11} /> Secured by Razorpay</span>
            <span>·</span><span>Cancel anytime</span><span>·</span><span>Prices include GST</span>
          </div>
        </>
      )}
    </div>
  );
}
