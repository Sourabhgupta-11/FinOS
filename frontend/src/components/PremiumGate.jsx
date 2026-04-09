import { Link } from "react-router-dom";
import { Crown, Zap, Lock } from "lucide-react";

const PLAN_INFO = {
  pro: {
    icon: Zap,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    badge: "bg-blue-600",
    name: "Pro",
    price: "₹99/month",
    desc: "Unlock expense tracking, bank accounts, tax calculator, budgets and more.",
  },
  premium: {
    icon: Crown,
    color: "text-amber-500",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    badge: "bg-amber-500",
    name: "Premium",
    price: "₹199/month",
    desc: "Unlock portfolio tracker with live NSE/BSE prices and all Pro features.",
  },
};

export default function PremiumGate({
  requiredPlan = "premium",
  feature = "This feature",
}) {
  const info = PLAN_INFO[requiredPlan] || PLAN_INFO.premium;
  const Icon = info.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className={`w-16 h-16 ${info.bg} rounded-2xl flex items-center justify-center mb-4`}
      >
        <Icon size={28} className={info.color} />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {feature} requires {info.name}
      </h2>
      <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mb-6 leading-relaxed">
        {info.desc}
      </p>
      <Link to="/subscription" className="btn-primary flex items-center gap-2">
        <Icon size={15} />
        Upgrade to {info.name} — {info.price}
      </Link>
      <p className="text-xs text-gray-400 dark:text-gray-600 mt-3">
        Cancel anytime · No hidden fees · Secured by Razorpay
      </p>
    </div>
  );
}
