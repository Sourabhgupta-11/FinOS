import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { Crown, Zap, Check, X, Clock, Flame } from "lucide-react";

// ─── Waitlist Modal ────────────────────────────────────────────────────────────
function WaitlistModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/launch/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setEmail("");
        setName("");
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 3000);
      } else {
        setError(data.message || data.error || "Failed to join waitlist");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-8 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg">
            ���
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">
            Join the Waitlist
          </h2>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              You're on the list!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We'll notify you the moment FinOS launches. Check your email for
              confirmation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Be among the first to access FinOS. We'll notify you when we go
              live with exclusive early-access benefits.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-xs text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Joining..." : "Join Waitlist"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Navbar({ onWaitlistClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-sm border-b border-gray-100 dark:border-gray-800" : ""}`}
    >
      <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
            FinOS
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {[
            ["Features", "#features"],
            ["How it works", "#how"],
            ["Pricing", "#pricing"],
            ["Contact", "/contact"],
          ].map(([label, href]) =>
            href.startsWith("#") ? (
              <a
                key={label}
                href={href}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
              >
                {label}
              </a>
            ) : (
              <Link
                key={label}
                to={href}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
              >
                {label}
              </Link>
            ),
          )}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onWaitlistClick}
            className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Join Waitlist
          </button>
          <Link
            to="/login"
            className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Sign in
          </Link>
          <Link to="/register" className="btn-primary text-sm px-5 py-2">
            Get started free →
          </Link>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-gray-700 dark:text-gray-300 p-2"
        >
          <div
            className={`w-5 h-0.5 bg-current mb-1 transition-all ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`}
          />
          <div
            className={`w-5 h-0.5 bg-current mb-1 transition-all ${menuOpen ? "opacity-0" : ""}`}
          />
          <div
            className={`w-5 h-0.5 bg-current transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`}
          />
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-3">
          {[
            ["Features", "#features"],
            ["How it works", "#how"],
            ["Pricing", "#pricing"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-gray-700 dark:text-gray-300 py-1"
            >
              {label}
            </a>
          ))}
          <button
            onClick={() => {
              onWaitlistClick();
              setMenuOpen(false);
            }}
            className="block w-full text-left text-sm text-blue-600 dark:text-blue-400 py-1 font-semibold"
          >
            Join Waitlist
          </button>
          <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Link
              to="/login"
              className="btn-secondary text-sm flex-1 text-center"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="btn-primary text-sm flex-1 text-center"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onWaitlistClick }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-16">
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-600/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "6s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-400/10 dark:bg-cyan-600/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "5s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>
      <div className="max-w-5xl mx-auto px-5 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold mb-6 tracking-wide">
          <Flame size={14} className="animate-pulse" />
          LAUNCHING SOON — SPECIAL EARLY ACCESS PRICING
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.05]">
          Your money,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600">
            intelligently
          </span>{" "}
          managed
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          FinOS is an AI-powered operating system for your finances. Track
          expenses, grow investments, get personalized advice — all in one
          beautiful dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link
            to="/register"
            className="btn-primary text-base px-8 py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
          >
            Start for free — no card needed
          </Link>
          <button
            onClick={onWaitlistClick}
            className="btn-secondary text-base px-8 py-3.5 rounded-2xl"
          >
            Join Waitlist ���
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-8 justify-center items-center pt-8 border-t border-gray-100 dark:border-gray-800">
          {[
            ["₹0", "Always free to start"],
            ["10+", "Powerful finance tools"],
            ["AI", "Smart advisor included"],
            ["���", "Bank-grade security"],
          ].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {val}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Launch Discount Banner ───────────────────────────────────────────────────
function LaunchDiscountBanner() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/launch/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch launch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && !stats?.launchMode) return null;

  return (
    <section className="py-16 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-y border-amber-200 dark:border-amber-800/50">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-widest mb-4">
              <Flame size={12} />
              SPECIAL LAUNCH OFFER
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
              ��� Early Bird Pricing
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              Be among the first users and get exclusive launch discounts for 6
              months.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    First 10 Users
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Complete access to any plan for{" "}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      FREE for 6 months
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Next 50 Pro Users
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="line-through text-gray-400">
                      ₹199/month
                    </span>{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      ₹99/month (50% off)
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Next 50 Premium Users
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="line-through text-gray-400">
                      ₹399/month
                    </span>{" "}
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      ₹199/month (50% off)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800/50 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 p-6 text-center">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
                  <Clock size={12} />
                  Free Tier
                </div>
                <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">
                  {stats.remaining.freeTier}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  seats remaining
                </div>
                <div className="w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.percentageUsed.freeTier}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {stats.current.free +
                    stats.current.pro +
                    stats.current.premium}
                  /{stats.limits.freeTierLimit} filled
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800/50 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-6 text-center">
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
                  <Zap size={12} />
                  Pro Discount
                </div>
                <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">
                  {stats.remaining.pro}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  seats remaining
                </div>
                <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.percentageUsed.pro}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {stats.current.pro}/{stats.limits.proDiscountedLimit} filled
                </div>
              </div>

              <div className="col-span-2 bg-white dark:bg-gray-800/50 rounded-2xl border-2 border-amber-200 dark:border-amber-800 p-6 text-center">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
                  <Crown size={12} />
                  Premium Discount
                </div>
                <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">
                  {stats.remaining.premium}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  seats remaining
                </div>
                <div className="w-full bg-amber-100 dark:bg-amber-900/30 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.percentageUsed.premium}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {stats.current.premium}/{stats.limits.premiumDiscountedLimit}{" "}
                  filled
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "���",
    title: "AI Financial Advisor",
    desc: "Get personalized, context-aware advice tailored to your income, goals, and risk tolerance. Powered by advanced LLMs.",
    tag: "Free",
  },
  {
    icon: "���",
    title: "Investment Allocator",
    desc: "Auto-allocate your monthly savings across equity, debt, gold, and FDs based on your risk profile — basic or advanced.",
    tag: "Free",
  },
  {
    icon: "���",
    title: "Portfolio Tracker",
    desc: "Track mutual funds, stocks, and assets in real time. See your net worth grow on a unified dashboard.",
    tag: "Premium",
  },
  {
    icon: "���",
    title: "Bank Account Linking",
    desc: "Connect your bank accounts securely via Setu to auto-import transactions and get a complete picture of your finances.",
    tag: "Pro",
    launchingSoon: true,
  },
  {
    icon: "���",
    title: "Decision Simulator",
    desc: "Model financial decisions before making them. What-if scenarios for loans, investments, and life changes.",
    tag: "Pro",
  },
  {
    icon: "���",
    title: "Tax Calculator",
    desc: "Optimise your taxes under the new and old regimes. Get deductions, rebates, and insights specific to your income.",
    tag: "Premium",
  },
  {
    icon: "���",
    title: "Expense Tracker",
    desc: "Categorise and analyse your spending. Set budgets, get alerts when you're overspending, and find savings.",
    tag: "Pro",
  },
  {
    icon: "���",
    title: "Budget Manager",
    desc: "Create category-level budgets and get real-time alerts when you're approaching or exceeding limits.",
    tag: "Premium",
  },
];

const TAG_STYLES = {
  Free: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  },
  Pro: {
    bg: "bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300",
  },
  Premium: {
    bg: "bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-300",
  },
};

function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-5">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
            Everything you need
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
            A complete finance OS
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Every tool you need to take control of your money, in one place.
          </p>
          <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
            {Object.entries(TAG_STYLES).map(([tag, { bg }]) => (
              <span
                key={tag}
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${bg}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`card-hover group cursor-default relative ${f.launchingSoon ? "opacity-75" : ""}`}
            >
              {f.launchingSoon && (
                <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-400 to-orange-400 text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-lg">
                  Coming Soon
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{f.icon}</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${TAG_STYLES[f.tag].bg}`}
                >
                  {f.tag}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">
                {f.title}
              </h3>
              <p
                className={`text-xs leading-relaxed ${f.launchingSoon ? "text-gray-400 dark:text-gray-600" : "text-gray-500 dark:text-gray-400"}`}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: "01",
    title: "Create your free account",
    desc: "Sign up in 30 seconds with Google or email. No credit card required, ever.",
  },
  {
    num: "02",
    title: "Set up your profile",
    desc: "Tell us your income, goals, and risk tolerance. This powers your personalised recommendations.",
  },
  {
    num: "03",
    title: "Connect & track",
    desc: "Link your bank account, add your investments, and watch your financial picture come alive.",
  },
  {
    num: "04",
    title: "Get AI-powered insights",
    desc: "Chat with your AI advisor, run simulations, and get monthly analysis to grow your wealth.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="py-24">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
            Simple to start
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
            How FinOS works
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            From sign-up to financial clarity in minutes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.num} className="relative">
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-blue-200 to-transparent dark:from-blue-800 z-0" />
              )}
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-lg font-black mb-4 shadow-lg shadow-blue-500/25">
                  {step.num}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    icon: null,
    borderClass: "border-2 border-gray-200 dark:border-gray-700",
    headerColor: "text-gray-500 dark:text-gray-400",
    checkColor: "text-emerald-500",
    ctaClass: "btn-secondary",
    ctaLabel: "Get started free",
    features: [
      { t: "Salary Allocator", ok: true },
      { t: "AI Advisor (3 msg/day)", ok: true },
      { t: "Financial Health Score", ok: true },
      { t: "Net Worth Dashboard", ok: true },
      { t: "Assets, Goals & Liabilities", ok: true },
      { t: "Decision Simulator", ok: false },
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
    price: "₹99",
    originalPrice: "₹199",
    period: "/month",
    icon: Zap,
    badge: "50% OFF",
    launchPrice: true,
    borderClass: "border-2 border-blue-500 dark:border-blue-500",
    headerColor: "text-blue-600 dark:text-blue-400",
    checkColor: "text-blue-500",
    ctaClass:
      "bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-150 cursor-pointer w-full text-center block",
    ctaLabel: "Start Pro →",
    glowClass: "shadow-lg shadow-blue-500/20",
    features: [
      { t: "Everything in Free", ok: true },
      { t: "AI Advisor (50 msg/day)", ok: true },
      { t: "Decision Simulator", ok: true },
      { t: "Allocation History", ok: true },
      { t: "Expense Tracker + CSV export", ok: true },
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
    price: "₹199",
    originalPrice: "₹399",
    period: "/month",
    icon: Crown,
    badge: "50% OFF",
    launchPrice: true,
    borderClass: "border-2 border-amber-500 dark:border-amber-500",
    headerColor: "text-amber-600 dark:text-amber-400",
    checkColor: "text-amber-500",
    ctaClass:
      "bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-amber-600 active:scale-95 transition-all duration-150 cursor-pointer w-full text-center block",
    ctaLabel: "Start Premium →",
    glowClass: "shadow-lg shadow-amber-500/20",
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

function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
            Simple pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
            Start free, upgrade when ready
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No hidden fees. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.key}
                className={`card ${plan.borderClass} ${plan.glowClass || ""} relative overflow-hidden flex flex-col`}
              >
                {plan.badge && (
                  <div className="absolute top-4 right-4">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        plan.key === "pro"
                          ? "bg-blue-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                {plan.key !== "free" && (
                  <div
                    className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-10 ${
                      plan.key === "pro" ? "bg-blue-400" : "bg-amber-400"
                    }`}
                  />
                )}

                <div className="relative flex flex-col flex-1">
                  <div className="mb-6">
                    <div
                      className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-2 ${plan.headerColor}`}
                    >
                      {Icon && <Icon size={15} />}
                      {plan.name}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-gray-900 dark:text-white">
                        {plan.price}
                      </span>
                      {plan.originalPrice && (
                        <span className="line-through text-gray-400 dark:text-gray-600 text-sm">
                          {plan.originalPrice}
                        </span>
                      )}
                      <span className="text-gray-400 text-sm">
                        {plan.period}
                      </span>
                    </div>
                    {plan.launchPrice && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-2">
                        ��� Limited time offer
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f.t}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        {f.ok ? (
                          <Check
                            size={14}
                            className={`${plan.checkColor} flex-shrink-0`}
                          />
                        ) : (
                          <X
                            size={14}
                            className="text-gray-300 dark:text-gray-600 flex-shrink-0"
                          />
                        )}
                        <span
                          className={
                            f.ok
                              ? "text-gray-700 dark:text-gray-300"
                              : "text-gray-400 dark:text-gray-600"
                          }
                        >
                          {f.t}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/register" className={plan.ctaClass}>
                    {plan.ctaLabel}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
          All plans include a free trial period. No credit card required to sign
          up.
        </p>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    role: "Software Engineer, Bengaluru",
    quote:
      "FinOS finally made me understand where my salary goes. The AI advisor suggested I was over-investing in FDs for my age — it was right.",
    avatar: "PS",
  },
  {
    name: "Arjun Mehta",
    role: "Startup Founder, Mumbai",
    quote:
      "The Decision Simulator saved me from a bad loan decision. I modelled three scenarios in minutes instead of spending hours on spreadsheets.",
    avatar: "AM",
  },
  {
    name: "Kavitha Nair",
    role: "Doctor, Hyderabad",
    quote:
      "As a professional with no time for finance, FinOS is a blessing. The tax calculator alone saved me ₹40,000 last year.",
    avatar: "KN",
  },
];

function Testimonials() {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
            Loved by smart Indians
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Join thousands building wealth with FinOS.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="card-hover">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {t.name}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {t.role}
                  </div>
                </div>
              </div>
              <div className="text-3xl text-blue-200 dark:text-blue-900 font-serif leading-none mb-2">
                "
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t.quote}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTA({ onWaitlistClick }) {
  return (
    <section
      className="py-24"
      style={{
        background:
          "linear-gradient(135deg, #1d4ed8 0%, #4f46e5 50%, #1e40af 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-3xl mx-auto px-5 text-center relative z-10">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-3xl backdrop-blur-sm">
          ���
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-5">
          Join FinOS Today
        </h2>

        <p className="text-blue-100 text-lg mb-10 leading-relaxed">
          Get started for free and be part of the launch.
          <br />
          Special launch pricing for the first 110 subscribers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="bg-white text-blue-700 font-bold px-8 py-3.5 rounded-2xl hover:bg-blue-50 active:scale-95 transition-all duration-150 shadow-2xl shadow-black/30 text-base"
          >
            Create free account →
          </Link>
          <button
            onClick={onWaitlistClick}
            className="border-2 border-white/60 text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-white/10 active:scale-95 transition-all duration-150 text-base"
          >
            Join Waitlist
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12 pt-8 border-t border-white/20">
          {[
            "No credit card required",
            "Cancel anytime",
            "Bank-grade security",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 text-blue-100 text-sm"
            >
              <Check size={14} className="text-white" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-gray-950 dark:bg-black text-gray-400 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-5 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <Logo size={32} />
              <span className="text-xl font-black text-white">FinOS</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500 max-w-xs mb-6">
              AI-powered financial operating system built for India. Manage,
              grow, and understand your money.
            </p>
            <div className="flex items-center gap-4">
              {["Twitter", "LinkedIn", "YouTube"].map((s) => (
                <span
                  key={s}
                  className="text-xs text-gray-600 hover:text-gray-400 cursor-pointer transition-colors"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Product
            </div>
            <ul className="space-y-2.5">
              {[
                ["Features", "#features"],
                ["Pricing", "#pricing"],
                ["How it works", "#how"],
                ["Sign up", "/register"],
              ].map(([label, href]) => (
                <li key={label}>
                  {href.startsWith("#") ? (
                    <a
                      href={href}
                      className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {label}
                    </a>
                  ) : (
                    <Link
                      to={href}
                      className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Legal
            </div>
            <ul className="space-y-2.5">
              {[
                ["Privacy Policy", "/privacy"],
                ["Terms & Conditions", "/terms"],
                ["Refund Policy", "/refund"],
                ["Contact Us", "/contact"],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link
                    to={href}
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} FinOS. All rights reserved. Made with ♥
            in India.
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen">
      <Navbar onWaitlistClick={() => setWaitlistOpen(true)} />
      <Hero onWaitlistClick={() => setWaitlistOpen(true)} />
      <LaunchDiscountBanner />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CTA onWaitlistClick={() => setWaitlistOpen(true)} />
      <Footer />
      <WaitlistModal
        isOpen={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
      />
    </div>
  );
}
