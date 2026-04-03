import { useState, useEffect } from 'react';
import { usePremium } from '../hooks/usePremium';
import api, { formatINR } from '../utils/api';
import { Crown, Zap, Check, X, Sparkles } from 'lucide-react';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '₹0',
    period: 'forever',
    icon: null,
    color: 'text-gray-500',
    features: [
      { text: 'Salary Allocator',             included: true },
      { text: 'AI Advisor (5 messages/day)',   included: true },
      { text: 'Financial Health Score',        included: true },
      { text: 'Basic dashboard',               included: true },
      { text: 'Expense tracker',               included: false },
      { text: 'Bank account linking',          included: false },
      { text: 'Tax Calculator',                included: false },
      { text: 'Budget Manager',                included: false },
      { text: 'Decision Simulator',            included: false },
      { text: 'Allocation history',            included: false },
      { text: 'Portfolio Tracker',             included: false },
      { text: 'Push notifications',            included: false },
      { text: 'Chat history',                  included: false },
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 99,
    priceLabel: '₹99',
    period: '/month',
    icon: Zap,
    color: 'text-blue-500',
    borderClass: 'border-blue-400 dark:border-blue-500',
    badge: 'Most Popular',
    badgeClass: 'bg-blue-600 text-white',
    features: [
      { text: 'Everything in Free',            included: true },
      { text: 'AI Advisor (100 messages/day)', included: true },
      { text: 'Expense tracker + CSV import',  included: true },
      { text: 'Bank account linking (Setu AA)',included: true },
      { text: 'Tax Calculator (Old vs New)',   included: true },
      { text: 'Budget Manager + Alerts',       included: true },
      { text: 'Decision Simulator',            included: true },
      { text: 'Allocation history',            included: true },
      { text: 'Push notifications',            included: true },
      { text: 'Chat history',                  included: true },
      { text: 'Portfolio Tracker',             included: false },
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 199,
    priceLabel: '₹199',
    period: '/month',
    icon: Crown,
    color: 'text-amber-500',
    borderClass: 'border-amber-400 dark:border-amber-500',
    badge: 'All Features',
    badgeClass: 'bg-amber-500 text-white',
    features: [
      { text: 'Everything in Pro',             included: true },
      { text: 'Unlimited AI Advisor',          included: true },
      { text: 'Portfolio Tracker (live NSE/BSE prices)', included: true },
      { text: 'Auto price refresh (market hours)', included: true },
      { text: 'Portfolio analytics + charts',  included: true },
      { text: 'Priority support',              included: true },
    ],
  },
];

export default function SubscriptionPage() {
  const { subscription, plan: currentPlan, loading } = usePremium();
  const [processing, setProcessing] = useState(null); // which plan is being processed
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  const handleUpgrade = async (planKey) => {
    if (planKey === 'free' || planKey === currentPlan) return;
    setError(''); setSuccess(''); setProcessing(planKey);

    try {
      const res = await api.post('/subscription', { planType: planKey });

      // Demo mode (no Razorpay keys configured)
      if (res.data.demo) {
        setSuccess(`✓ ${res.data.plan.charAt(0).toUpperCase() + res.data.plan.slice(1)} plan activated! Refresh to see changes.`);
        setProcessing(null);
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      const { subscriptionId, keyId, amount, currency } = res.data;

      if (!window.Razorpay) {
        setError('Payment gateway not loaded. Please refresh and try again.');
        setProcessing(null);
        return;
      }

      const rzp = new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        name: 'FinOS',
        description: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} — ₹${planKey === 'pro' ? '99' : '199'}/month`,
        image: '/icon-192.png',
        theme: { color: planKey === 'pro' ? '#2563eb' : '#f59e0b' },
        handler: () => {
          setSuccess('✓ Payment successful! Your plan is being activated…');
          setProcessing(null);
          setTimeout(() => window.location.reload(), 2000);
        },
        modal: { ondismiss: () => setProcessing(null) },
      });

      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setProcessing(null);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not initiate payment. Please try again.');
      setProcessing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel subscription? You keep access until end of billing period.')) return;
    try {
      await api.delete('/subscription');
      setSuccess('Subscription cancelled. You keep access until end of billing period.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Cancel failed. Please try again.');
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading…</div>;

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Subscription</h1>
        <p className="text-gray-400 text-sm mt-0.5">Choose the plan that fits your financial journey</p>
      </div>

      {/* Status banner */}
      {currentPlan !== 'free' && (
        <div className={`card flex items-center justify-between ${currentPlan === 'premium' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'}`}>
          <div className="flex items-center gap-3">
            {currentPlan === 'premium' ? <Crown size={18} className="text-amber-500" /> : <Zap size={18} className="text-blue-500" />}
            <div>
              <div className={`font-semibold text-sm ${currentPlan === 'premium' ? 'text-amber-900 dark:text-amber-200' : 'text-blue-900 dark:text-blue-200'}`}>
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan active
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {periodEnd ? `Renews ${periodEnd}` : 'Active'}
                {subscription?.cancel_at_period_end ? ' · Cancels at period end' : ''}
              </div>
            </div>
          </div>
          {!subscription?.cancel_at_period_end && (
            <button onClick={handleCancel}
              className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors underline">
              Cancel
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-green-700 dark:text-green-300 text-sm px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.key;
          const isUpgrade = ['free','pro','premium'].indexOf(p.key) > ['free','pro','premium'].indexOf(currentPlan);
          const PlanIcon = p.icon;

          return (
            <div key={p.key} className={`card relative flex flex-col ${p.borderClass ? `border-2 ${p.borderClass}` : ''}`}>
              {p.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${p.badgeClass}`}>
                  {p.badge}
                </div>
              )}

              <div className="mb-4 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  {PlanIcon && <PlanIcon size={16} className={p.color} />}
                  <span className={`text-sm font-semibold ${p.color}`}>{p.name}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{p.priceLabel}</span>
                  <span className="text-sm text-gray-400">{p.period}</span>
                </div>
              </div>

              <div className="flex-1 space-y-2 mb-5">
                {p.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {f.included
                      ? <Check size={13} className="text-green-500 flex-shrink-0" />
                      : <X size={13} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />}
                    <span className={f.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <div className="text-center text-sm font-medium text-gray-400 dark:text-gray-500 py-2">
                  ✓ Current plan
                </div>
              ) : isUpgrade ? (
                <button
                  onClick={() => handleUpgrade(p.key)}
                  disabled={!!processing}
                  className={`btn-primary w-full flex items-center justify-center gap-2 text-sm
                    ${p.key === 'premium' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                >
                  {PlanIcon && <PlanIcon size={14} />}
                  {processing === p.key ? 'Opening…' : `Get ${p.name}`}
                </button>
              ) : (
                <div className="text-center text-xs text-gray-300 dark:text-gray-600 py-2">
                  Lower than current plan
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-gray-400 dark:text-gray-600">
        <span className="flex items-center gap-1"><Sparkles size={12} /> Powered by Razorpay</span>
        <span>·</span>
        <span>Cancel anytime, no questions asked</span>
        <span>·</span>
        <span>Prices inclusive of GST</span>
      </div>
    </div>
  );
}
