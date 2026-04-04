import { useState, useEffect } from 'react';
import { usePremium } from '../hooks/usePremium';
import api, { formatINR } from '../utils/api';
import { Crown, Zap, Check, X, Sparkles, AlertTriangle } from 'lucide-react';

const PLANS = [
  {
    key: 'free', name: 'Free', priceLabel: '₹0', period: 'forever', icon: null,
    color: 'text-gray-500 dark:text-gray-400',
    features: [
      { text: 'Salary Allocator',            ok: true },
      { text: 'AI Advisor (5 msg/day)',       ok: true },
      { text: 'Financial Health Score',       ok: true },
      { text: 'Basic Dashboard',              ok: true },
      { text: 'Expense Tracker',              ok: false },
      { text: 'Bank Account Linking',         ok: false },
      { text: 'Tax Calculator',               ok: false },
      { text: 'Budget Manager',               ok: false },
      { text: 'Decision Simulator',           ok: false },
      { text: 'Allocation History',           ok: false },
      { text: 'Portfolio Tracker',            ok: false },
      { text: 'Chat History',                 ok: false },
    ],
  },
  {
    key: 'pro', name: 'Pro', priceLabel: '₹99', period: '/month', icon: Zap,
    color: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-2 border-blue-400 dark:border-blue-500',
    badge: 'Most Popular', badgeCls: 'bg-blue-600 text-white',
    features: [
      { text: 'Everything in Free',           ok: true },
      { text: 'AI Advisor (100 msg/day)',      ok: true },
      { text: 'Expense Tracker + CSV',         ok: true },
      { text: 'Bank Account Linking (Setu)',   ok: true },
      { text: 'Tax Calculator (Old vs New)',   ok: true },
      { text: 'Budget Manager + Alerts',       ok: true },
      { text: 'Decision Simulator',            ok: true },
      { text: 'Allocation History',            ok: true },
      { text: 'Push Notifications',            ok: true },
      { text: 'Chat History',                  ok: true },
      { text: 'Portfolio Tracker',             ok: false },
    ],
  },
  {
    key: 'premium', name: 'Premium', priceLabel: '₹199', period: '/month', icon: Crown,
    color: 'text-amber-500 dark:text-amber-400',
    borderClass: 'border-2 border-amber-400 dark:border-amber-500',
    badge: 'All Features', badgeCls: 'bg-amber-500 text-white',
    features: [
      { text: 'Everything in Pro',             ok: true },
      { text: 'Unlimited AI Advisor',          ok: true },
      { text: 'Portfolio Tracker (live NSE)',   ok: true },
      { text: 'Auto price refresh',            ok: true },
      { text: 'Portfolio analytics',           ok: true },
      { text: 'Priority support',              ok: true },
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

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  const handleUpgrade = async (planKey) => {
    if (planKey === 'free' || planKey === currentPlan) return;
    if (PLAN_ORDER[planKey] < PLAN_ORDER[currentPlan]) return;
    setError(''); setSuccess(''); setProcessing(planKey);
    try {
      const res = await api.post('/subscription', { planType: planKey });
      if (res.data.demo) {
        setSuccess(`✓ ${res.data.plan.charAt(0).toUpperCase() + res.data.plan.slice(1)} activated (demo mode — no Razorpay keys configured).`);
        setProcessing(null);
        setTimeout(() => window.location.reload(), 1800);
        return;
      }
      const { subscriptionId, keyId } = res.data;
      if (!window.Razorpay) {
        setError('Payment gateway not loaded. Please refresh.'); setProcessing(null); return;
      }
      const rzp = new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        name: 'FinOS',
        description: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} — ${planKey === 'pro' ? '₹99' : '₹199'}/month`,
        image: '/logo.svg',
        theme: { color: planKey === 'pro' ? '#2563eb' : '#f59e0b' },
        handler: () => {
          setSuccess('✓ Payment successful! Your plan is being activated…');
          setProcessing(null);
          setTimeout(() => window.location.reload(), 2500);
        },
        modal: {
          ondismiss: () => setProcessing(null),
          escape: true,
        },
      });
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setProcessing(null);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not initiate payment.');
      setProcessing(null);
    }
  };

  const handleCancel = async () => {
    try {
      await api.delete('/subscription');
      setSuccess('Subscription cancelled. Access continues until billing period ends.');
      setShowCancel(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Cancel failed.');
    }
  };

  if (loading) return <div className="text-gray-400 animate-pulse text-sm">Loading…</div>;

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Subscription</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Choose the plan that fits your financial journey</p>
      </div>

      {/* Current plan banner */}
      {currentPlan !== 'free' && (
        <div className={`card flex items-center justify-between gap-4 ${currentPlan === 'premium' ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20' : 'border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-900/20'}`}>
          <div className="flex items-center gap-3">
            {currentPlan === 'premium' ? <Crown size={18} className="text-amber-500" /> : <Zap size={18} className="text-blue-500" />}
            <div>
              <div className={`font-semibold text-sm ${currentPlan === 'premium' ? 'text-amber-900 dark:text-amber-200' : 'text-blue-900 dark:text-blue-200'}`}>
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan active
              </div>
              {periodEnd && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {subscription?.cancel_at_period_end ? `Cancels ${periodEnd}` : `Renews ${periodEnd}`}
                </div>
              )}
            </div>
          </div>
          {!subscription?.cancel_at_period_end && (
            <button onClick={() => setShowCancel(true)} className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 underline transition-colors">
              Cancel subscription
            </button>
          )}
        </div>
      )}

      {/* Cancel confirmation */}
      {showCancel && (
        <div className="card border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-900 dark:text-red-200 text-sm">Cancel subscription?</div>
              <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                You'll keep access until {periodEnd || 'end of billing period'}. After that you'll move to the Free plan.
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={handleCancel} className="text-sm px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
                  Yes, cancel
                </button>
                <button onClick={() => setShowCancel(false)} className="btn-secondary text-sm py-2">
                  Keep subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</div>}
      {success && <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl">{success}</div>}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.key;
          const canUpgrade = PLAN_ORDER[p.key] > PLAN_ORDER[currentPlan];
          const Icon = p.icon;
          return (
            <div key={p.key} className={`card relative flex flex-col ${p.borderClass || ''}`}>
              {p.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap ${p.badgeCls}`}>
                  {p.badge}
                </div>
              )}
              <div className="mb-4 pt-1">
                <div className="flex items-center gap-1.5 mb-2">
                  {Icon && <Icon size={15} className={p.color} />}
                  <span className={`text-sm font-bold ${p.color}`}>{p.name}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{p.priceLabel}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{p.period}</span>
                </div>
              </div>

              <div className="flex-1 space-y-1.5 mb-5">
                {p.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {f.ok
                      ? <Check size={12} className="text-emerald-500 flex-shrink-0" />
                      : <X size={12} className="text-gray-200 dark:text-gray-700 flex-shrink-0" />}
                    <span className={f.ok ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}>{f.text}</span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <div className="text-center text-sm font-medium text-gray-400 dark:text-gray-500 py-2.5 border border-gray-100 dark:border-gray-800 rounded-xl">
                  ✓ Current plan
                </div>
              ) : canUpgrade ? (
                <button onClick={() => handleUpgrade(p.key)} disabled={!!processing}
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
        <span>·</span><span>Cancel anytime</span><span>·</span><span>Prices inclusive of GST</span>
      </div>
    </div>
  );
}
