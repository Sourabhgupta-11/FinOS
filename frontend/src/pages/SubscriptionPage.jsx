import { useState, useEffect } from 'react';
import { usePremium } from '../hooks/usePremium';
import api, { formatINR } from '../utils/api';
import { Crown, Check, X, Zap } from 'lucide-react';

const FREE_FEATURES  = ['Salary Allocator', 'AI Advisor (20 msg/day)', 'Decision Simulator', 'Financial Health Score'];
const PREMIUM_EXTRAS = ['Unlimited AI Advisor', 'Portfolio Tracker (live prices)', 'Tax Calculator (Old vs New regime)', 'Bank Account linking (Setu AA)', 'Expense Manager + CSV import', 'Budget Manager + Alerts', 'SIP & Budget push notifications', 'Chat history & sessions'];

export default function SubscriptionPage() {
  const { isPremium, subscription, loading } = usePremium();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const handleUpgrade = async () => {
    setError(''); setProcessing(true);
    try {
      const res = await api.post('/subscription');
      const { subscriptionId, keyId } = res.data;

      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: 'Financial OS',
        description: 'Premium — ₹199/month',
        image: '/icon-192.png',
        theme: { color: '#2563eb' },
        handler: async (response) => {
          window.location.reload();
        },
        modal: {
          ondismiss: () => setProcessing(false),
        },
      };

      if (!window.Razorpay) {
        setError('Payment gateway not loaded. Please refresh and try again.');
        setProcessing(false);
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setProcessing(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not initiate payment. Please try again.');
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel subscription? You keep Premium until end of billing period.')) return;
    try {
      await api.delete('/subscription');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Cancel failed');
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Subscription</h1>
        <p className="text-gray-400 text-sm mt-0.5">Manage your Financial OS plan</p>
      </div>

      {/* Current status */}
      {isPremium ? (
        <div className="card border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3 mb-3">
            <Crown size={20} className="text-amber-500" />
            <div>
              <div className="font-semibold text-amber-900">Premium active</div>
              <div className="text-xs text-amber-700">
                {subscription?.current_period_end
                  ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : 'Active subscription'}
                {subscription?.cancel_at_period_end && ' · Cancels at period end'}
              </div>
            </div>
          </div>
          {!subscription?.cancel_at_period_end && (
            <button onClick={handleCancel} className="text-sm text-amber-700 hover:text-amber-900 underline">
              Cancel subscription
            </button>
          )}
        </div>
      ) : (
        <div className="card border-blue-100 bg-blue-50">
          <div className="text-sm font-medium text-blue-800 mb-1">You're on the Free plan</div>
          <div className="text-xs text-blue-600">Upgrade to unlock the full Financial OS experience</div>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

      {/* Plans comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Free */}
        <div className="card">
          <div className="text-sm font-semibold text-gray-700 mb-1">Free</div>
          <div className="text-2xl font-bold text-gray-900 mb-4">₹0 <span className="text-sm font-normal text-gray-400">/month</span></div>
          <div className="space-y-2">
            {FREE_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={14} className="text-green-500 flex-shrink-0" /> {f}
              </div>
            ))}
            {PREMIUM_EXTRAS.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <X size={14} className="flex-shrink-0" /> {f}
              </div>
            ))}
          </div>
        </div>

        {/* Premium */}
        <div className="card border-2 border-blue-500 relative">
          <div className="absolute -top-3 left-4 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
            <Zap size={10} /> Most Popular
          </div>
          <div className="text-sm font-semibold text-blue-700 mb-1">Premium</div>
          <div className="text-2xl font-bold text-gray-900 mb-4">₹199 <span className="text-sm font-normal text-gray-400">/month</span></div>
          <div className="space-y-2 mb-6">
            {FREE_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={14} className="text-green-500 flex-shrink-0" /> {f}
              </div>
            ))}
            {PREMIUM_EXTRAS.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                <Check size={14} className="text-blue-500 flex-shrink-0" /> {f}
              </div>
            ))}
          </div>
          {!isPremium && (
            <button onClick={handleUpgrade} disabled={processing}
              className="btn-primary w-full flex items-center justify-center gap-2">
              <Crown size={16} />
              {processing ? 'Opening payment…' : 'Upgrade to Premium'}
            </button>
          )}
          {isPremium && (
            <div className="text-center text-sm text-green-600 font-medium">✓ Current plan</div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-400 text-center">
        Secured by Razorpay · Cancel anytime · No hidden fees · Prices inclusive of GST
      </div>
    </div>
  );
}
