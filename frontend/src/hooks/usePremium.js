import { useState, useEffect } from 'react';
import api from '../utils/api';

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/subscription')
      .then(r => {
        setSubscription(r.data);
        setIsPremium(r.data?.plan === 'premium' && r.data?.status === 'active');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { isPremium, subscription, loading };
}
