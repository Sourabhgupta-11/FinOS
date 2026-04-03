import { Link } from 'react-router-dom';
import { Crown, Lock } from 'lucide-react';

export default function PremiumGate({ feature = 'This feature' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
        <Crown size={28} className="text-amber-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{feature} requires Premium</h2>
      <p className="text-gray-400 text-sm max-w-xs mb-6">
        Upgrade to Financial OS Premium for ₹199/month to unlock portfolio tracking, tax calculator, expense manager, bank linking, and more.
      </p>
      <Link to="/subscription" className="btn-primary flex items-center gap-2">
        <Crown size={16} />
        Upgrade to Premium — ₹199/month
      </Link>
      <p className="text-xs text-gray-400 mt-3">Cancel anytime. No hidden fees.</p>
    </div>
  );
}
