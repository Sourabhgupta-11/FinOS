import { useState, useEffect } from "react";
import { usePremium } from "../hooks/usePremium";
import api, { formatDate } from "../utils/api";
import {
  Crown,
  Zap,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Settings,
} from "lucide-react";

const PLANS = [
  {
    key: "free",
    name: "Free",
    priceLabel: "₹0",
    period: "forever",
    icon: null,
    color: "text-gray-500 dark:text-gray-400",
    aiMsg: "3 msg/day",
    features: [
      { t: "Salary Allocator", ok: true },
      { t: "AI Advisor (3 msg/day)", ok: true },
      { t: "Financial Health Score", ok: true },
      { t: "Net Worth Dashboard", ok: true },
      { t: "Assets, Goals & Liabilities", ok: true },
      { t: "Decision Simulator", ok: false },
      { t: "Allocation History", ok: false },
      { t: "Expense Tracker", ok: false },
      { t: "Bank Account Linking", ok: false },
      { t: "Tax Calculator", ok: false },
      { t: "Budget Manager", ok: false },
      { t: "Portfolio Tracker", ok: false },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    priceLabel: "₹99",
    period: "/month",
    icon: Zap,
    color: "text-blue-600 dark:text-blue-400",
    aiMsg: "50 msg/day",
    borderClass: "border-2 border-blue-400 dark:border-blue-500",
    badge: "Best Value",
    badgeCls: "bg-blue-600 text-white",
    features: [
      { t: "Everything in Free", ok: true },
      { t: "AI Advisor (50 msg/day)", ok: true },
      { t: "Decision Simulator", ok: true },
      { t: "Allocation History", ok: true },
      { t: "Expense Tracker + CSV", ok: true },
      { t: "Bank Account Linking", ok: true },
      { t: "Push Notifications", ok: true },
      { t: "Chat History", ok: true },
      { t: "Tax Calculator", ok: false },
      { t: "Budget Manager", ok: false },
      { t: "Portfolio Tracker", ok: false },
    ],
  },
  {
    key: "premium",
    name: "Premium",
    priceLabel: "₹199",
    period: "/month",
    icon: Crown,
    color: "text-amber-500 dark:text-amber-400",
    aiMsg: "Unlimited",
    borderClass: "border-2 border-amber-400 dark:border-amber-500",
    badge: "All Features",
    badgeCls: "bg-amber-500 text-white",
    features: [
      { t: "Everything in Pro", ok: true },
      { t: "Unlimited AI Advisor", ok: true },
      { t: "Tax Calculator (Old vs New)", ok: true },
      { t: "Budget Manager + Alerts", ok: true },
      { t: "Portfolio Tracker (live NSE)", ok: true },
      { t: "All Notifications", ok: true },
      { t: "Priority support", ok: true },
    ],
  },
];

const PLAN_ORDER = { free: 0, pro: 1, premium: 2 };

export default function SubscriptionPage() {
  const { subscription, plan: currentPlan, loading: subLoading } = usePremium();
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Always show plans + a manage section below
  // We show "My Plan" info always at top, plans always visible for comparison/upgrade

  useEffect(() => {
    // Lemonsqueezy handles checkout through redirect, no script needed
    return () => {};
  }, []);

  const upgrade = async (planKey) => {
    if (planKey === "free") return;
    setError("");
    setSuccess("");
    setProcessing(planKey);
    try {
      const res = await api.post("/subscription", { planType: planKey });
      if (res.data.demo) {
        setSuccess(
          `✓ ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan activated (demo mode — configure Lemonsqueezy keys for live payments).`,
        );
        setProcessing(null);
        setTimeout(() => window.location.reload(), 2000);
        return;
      }
      if (!res.data.checkoutURL) {
        setError("Could not generate checkout link. Please try again.");
        setProcessing(null);
        return;
      }
      // Redirect to Lemonsqueezy checkout
      window.location.href = res.data.checkoutURL;
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not start payment. Please try again.",
      );
      setProcessing(null);
    }
  };

  const cancelSubscription = async () => {
    try {
      await api.delete("/subscription");
      setSuccess(
        "Subscription cancelled. You keep access until the end of your billing period.",
      );
      setShowCancelConfirm(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setError(
        err.response?.data?.error || "Cancellation failed. Please try again.",
      );
    }
  };

  if (subLoading)
    return <div className="text-gray-400 animate-pulse text-sm">Loading…</div>;

  const periodEnd = subscription?.current_period_end
    ? formatDate(subscription.current_period_end)
    : null;
  const periodStart = subscription?.current_period_start
    ? formatDate(subscription.current_period_start)
    : null;
  const isCancelling = subscription?.cancel_at_period_end;
  const planInfo = PLANS.find((p) => p.key === currentPlan);
  const PlanIcon = planInfo?.icon;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Subscription
        </h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
          Manage your FinOS plan
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {/* ── MY PLAN CARD — always visible ─────────────────────────────── */}
      <div
        className={`card ${
          currentPlan === "premium"
            ? "border-amber-200 dark:border-amber-800/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
            : currentPlan === "pro"
              ? "border-blue-200 dark:border-blue-800/60 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
              : ""
        }`}
      >
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3">
            {PlanIcon ? (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentPlan === "premium" ? "bg-amber-100 dark:bg-amber-900/40" : "bg-blue-100 dark:bg-blue-900/40"}`}
              >
                <PlanIcon size={20} className={planInfo?.color} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Settings size={18} className="text-gray-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 dark:text-white text-base">
                  {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}{" "}
                  Plan
                </span>
                {currentPlan !== "free" && !isCancelling && (
                  <span className="badge-success text-xs">Active</span>
                )}
                {isCancelling && (
                  <span className="badge-warning text-xs">Cancelling</span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {planInfo?.priceLabel}
                {planInfo?.period !== "forever" ? planInfo?.period : ""} ·{" "}
                {planInfo?.aiMsg} AI messages
              </div>
            </div>
          </div>
        </div>

        {/* Billing dates */}
        {currentPlan !== "free" && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {periodStart && (
              <div className="flex items-center gap-2.5 p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl">
                <Calendar size={15} className="text-gray-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">Billing started</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {periodStart}
                  </div>
                </div>
              </div>
            )}
            {periodEnd && (
              <div className="flex items-center gap-2.5 p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl">
                <RefreshCw size={15} className="text-gray-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">
                    {isCancelling ? "Access until" : "Next renewal"}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {periodEnd}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {currentPlan !== "free" && !isCancelling && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-sm px-4 py-2 rounded-xl border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Cancel subscription
            </button>
          )}
          {isCancelling && (
            <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/40">
              Your subscription cancels on {periodEnd}. After that you'll move
              to Free.
            </div>
          )}
          {currentPlan === "free" && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              You're on the Free plan. Upgrade below to unlock more features.
            </div>
          )}
        </div>
      </div>

      {/* ── CANCEL CONFIRMATION ────────────────────────────────────────── */}
      {showCancelConfirm && (
        <div className="card border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={18}
              className="text-red-500 flex-shrink-0 mt-0.5"
            />
            <div className="flex-1">
              <div className="font-semibold text-red-900 dark:text-red-200 text-sm mb-1">
                Are you sure you want to cancel?
              </div>
              <div className="text-xs text-red-700 dark:text-red-300 leading-relaxed mb-3">
                You'll keep all{" "}
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}{" "}
                features until <strong>{periodEnd}</strong>. After that, your
                account moves to the Free plan and premium features will be
                locked.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={cancelSubscription}
                  className="text-sm px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium"
                >
                  Yes, cancel my subscription
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="btn-secondary text-sm py-2"
                >
                  Keep subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PLANS — always shown for comparison/upgrade ───────────────── */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">
          {currentPlan === "free" ? "Choose a plan" : "All plans"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((p) => {
            const isCurrent = currentPlan === p.key;
            const canUpgrade =
              PLAN_ORDER[p.key] > PLAN_ORDER[currentPlan] && !isCancelling;
            const Icon = p.icon;
            return (
              <div
                key={p.key}
                className={`card relative flex flex-col ${isCurrent ? p.borderClass || "border-2 border-gray-300 dark:border-gray-600" : p.borderClass || ""}`}
              >
                {p.badge && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap ${p.badgeCls}`}
                  >
                    {p.badge}
                  </div>
                )}
                <div className="mb-3 pt-1">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {Icon && <Icon size={14} className={p.color} />}
                    <span className={`text-sm font-bold ${p.color}`}>
                      {p.name}
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        (current)
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {p.priceLabel}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {p.period}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    AI: {p.aiMsg}
                  </div>
                </div>

                <div className="flex-1 space-y-1.5 mb-4">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {f.ok ? (
                        <Check
                          size={11}
                          className="text-emerald-500 flex-shrink-0"
                        />
                      ) : (
                        <X
                          size={11}
                          className="text-gray-200 dark:text-gray-700 flex-shrink-0"
                        />
                      )}
                      <span
                        className={
                          f.ok
                            ? "text-gray-700 dark:text-gray-300"
                            : "text-gray-300 dark:text-gray-600"
                        }
                      >
                        {f.t}
                      </span>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <div className="text-center text-sm font-medium text-gray-400 dark:text-gray-500 py-2.5 border border-gray-100 dark:border-gray-800 rounded-xl">
                    ✓ Your current plan
                  </div>
                ) : canUpgrade ? (
                  <button
                    onClick={() => upgrade(p.key)}
                    disabled={!!processing}
                    className={`btn-primary w-full flex items-center justify-center gap-1.5 text-sm ${p.key === "premium" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                  >
                    {Icon && <Icon size={13} />}
                    {processing === p.key
                      ? "Opening payment…"
                      : `Upgrade to ${p.name}`}
                  </button>
                ) : (
                  <div className="text-center text-xs text-gray-300 dark:text-gray-600 py-2">
                    —
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400 dark:text-gray-600">
        <span className="flex items-center gap-1">
          <Sparkles size={11} /> Secured by Razorpay
        </span>
        <span>·</span>
        <span>Cancel anytime</span>
        <span>·</span>
        <span>Prices include GST</span>
      </div>
    </div>
  );
}
