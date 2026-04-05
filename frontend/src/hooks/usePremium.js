import { useState, useEffect } from 'react';
import api from '../utils/api';

const PLAN_ORDER = { free: 0, pro: 1, premium: 2 };

export function usePremium() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/subscription')
      .then(r => setSubscription(r.data))
      .catch(() => setSubscription({ plan: 'free', status: 'active' }))
      .finally(() => setLoading(false));
  }, []);

  const plan = subscription?.plan || 'free';
  const isActive = subscription?.status === 'active' &&
    (!subscription?.current_period_end || new Date(subscription.current_period_end) > new Date());
  const effectivePlan = isActive ? plan : 'free';

  return {
    subscription,
    loading,
    plan: effectivePlan,
    isPro:     PLAN_ORDER[effectivePlan] >= PLAN_ORDER.pro,
    isPremium: PLAN_ORDER[effectivePlan] >= PLAN_ORDER.premium,
    isFree:    effectivePlan === 'free',
    hasPlan: (minPlan) => PLAN_ORDER[effectivePlan] >= (PLAN_ORDER[minPlan] ?? 0),
    // AI limits
    aiLimit: effectivePlan === 'premium' ? -1 : effectivePlan === 'pro' ? 50 : 3,
  };
}
