import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-sm border-b border-gray-100 dark:border-gray-800" : ""}`}>
      <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white">FinOS</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {[["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"], ["Contact", "/contact"]].map(([label, href]) => (
            href.startsWith("#")
              ? <a key={label} href={href} className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">{label}</a>
              : <Link key={label} to={href} className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">{label}</Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Sign in</Link>
          <Link to="/register" className="btn-primary text-sm px-5 py-2">Get started free →</Link>
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-700 dark:text-gray-300 p-2">
          <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
          <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${menuOpen ? "opacity-0" : ""}`} />
          <div className={`w-5 h-0.5 bg-current transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-3">
          {[["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"]].map(([label, href]) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 dark:text-gray-300 py-1">{label}</a>
          ))}
          <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Link to="/login" className="btn-secondary text-sm flex-1 text-center">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm flex-1 text-center">Get started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-16">
      {/* Animated background mesh */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-400/10 dark:bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "5s" }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]" style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px"
        }} />
      </div>

      <div className="max-w-5xl mx-auto px-5 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          AI-POWERED FINANCE FOR INDIA
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.05]">
          Your money,{" "}
          <span className="relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600">
              intelligently
            </span>
          </span>
          {" "}managed
        </h1>

        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          FinOS is an AI-powered operating system for your finances. Track expenses, grow investments, get personalized advice — all in one beautiful dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link to="/register" className="btn-primary text-base px-8 py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow">
            Start for free — no card needed
          </Link>
          <a href="#features" className="btn-secondary text-base px-8 py-3.5 rounded-2xl">
            See what's inside ↓
          </a>
        </div>

        {/* Stats strip */}
        <div className="flex flex-col sm:flex-row gap-8 justify-center items-center pt-8 border-t border-gray-100 dark:border-gray-800">
          {[
            ["₹0", "Always free to start"],
            ["10+", "Powerful finance tools"],
            ["AI", "Smart advisor included"],
            ["🔒", "Bank-grade security"],
          ].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-black text-gray-900 dark:text-white">{val}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features grid ────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "🤖", title: "AI Financial Advisor", desc: "Get personalized, context-aware advice tailored to your income, goals, and risk tolerance. Powered by advanced LLMs.", tag: "AI" },
  { icon: "📊", title: "Investment Allocator", desc: "Auto-allocate your monthly savings across equity, debt, gold, and FDs based on your risk profile — basic or advanced.", tag: "Smart" },
  { icon: "💼", title: "Portfolio Tracker", desc: "Track mutual funds, stocks, and assets in real time. See your net worth grow on a unified dashboard.", tag: "Premium" },
  { icon: "🏦", title: "Bank Account Linking", desc: "Connect your bank accounts securely via Setu to auto-import transactions and get a complete picture of your finances.", tag: "Premium" },
  { icon: "📈", title: "Decision Simulator", desc: "Model financial decisions before making them. What-if scenarios for loans, investments, and life changes.", tag: "Premium" },
  { icon: "🧾", title: "Tax Calculator", desc: "Optimise your taxes under the new and old regimes. Get deductions, rebates, and insights specific to your income.", tag: "Free" },
  { icon: "💳", title: "Expense Tracker", desc: "Categorise and analyse your spending. Set budgets, get alerts when you're overspending, and find savings.", tag: "Free" },
  { icon: "📅", title: "Budget Manager", desc: "Create category-level budgets and get real-time alerts when you're approaching or exceeding limits.", tag: "Free" },
];

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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-hover group cursor-default">
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{f.icon}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  f.tag === "Premium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                  f.tag === "AI" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" :
                  f.tag === "Smart" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" :
                  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                }`}>{f.tag}</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
const STEPS = [
  { num: "01", title: "Create your free account", desc: "Sign up in 30 seconds with Google or email. No credit card required, ever." },
  { num: "02", title: "Set up your profile", desc: "Tell us your income, goals, and risk tolerance. This powers your personalised recommendations." },
  { num: "03", title: "Connect & track", desc: "Link your bank account, add your investments, and watch your financial picture come alive." },
  { num: "04", title: "Get AI-powered insights", desc: "Chat with your AI advisor, run simulations, and get monthly analysis to grow your wealth." },
];

function HowItWorks() {
  return (
    <section id="how" className="py-24">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
            Simple to start
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">How FinOS works</h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg">From sign-up to financial clarity in minutes.</p>
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
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-4xl mx-auto px-5">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
            Simple pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">Start free, upgrade when ready</h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No hidden fees. Cancel anytime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="card border-2 border-gray-200 dark:border-gray-700">
            <div className="mb-6">
              <div className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Free forever</div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-gray-900 dark:text-white">₹0</span>
                <span className="text-gray-400">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {["Expense & budget tracking", "Tax calculator", "Investment allocator (basic)", "Transaction history", "Email & push notifications"].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-emerald-500 font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link to="/register" className="btn-secondary w-full text-center block">Get started free</Link>
          </div>

          {/* Premium */}
          <div className="card border-2 border-blue-600 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-600 text-white">MOST POPULAR</span>
            </div>
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-blue-50 dark:bg-blue-950/30 rounded-full" />
            <div className="relative">
              <div className="mb-6">
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Premium</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-gray-900 dark:text-white">₹199</span>
                  <span className="text-gray-400">/month</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Everything in Free",
                  "AI Advisor (unlimited chats)",
                  "Decision Simulator",
                  "Portfolio tracker",
                  "Bank account linking",
                  "Advanced allocator",
                  "Priority support",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-blue-500 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="btn-primary w-full text-center block shadow-lg shadow-blue-500/25">Start Premium trial →</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: "Priya Sharma", role: "Software Engineer, Bengaluru", quote: "FinOS finally made me understand where my salary goes. The AI advisor suggested I was over-investing in FDs for my age — it was right.", avatar: "PS" },
  { name: "Arjun Mehta", role: "Startup Founder, Mumbai", quote: "The Decision Simulator saved me from a bad loan decision. I modelled three scenarios in minutes instead of spending hours on spreadsheets.", avatar: "AM" },
  { name: "Kavitha Nair", role: "Doctor, Hyderabad", quote: "As a professional with no time for finance, FinOS is a blessing. The tax calculator alone saved me ₹40,000 last year.", avatar: "KN" },
];

function Testimonials() {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-4">Loved by smart Indians</h2>
          <p className="text-gray-500 dark:text-gray-400">Join thousands building wealth with FinOS.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="card-hover">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{t.name}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{t.role}</div>
                </div>
              </div>
              <div className="text-3xl text-blue-200 dark:text-blue-900 font-serif leading-none mb-2">"</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t.quote}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800" />
      <div className="absolute inset-0 -z-10 opacity-10" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
        backgroundSize: "40px 40px"
      }} />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

      <div className="max-w-3xl mx-auto px-5 text-center relative">
        <div className="text-5xl mb-6">₹</div>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
          Take control of your financial future today
        </h2>
        <p className="text-blue-100 text-lg mb-10 leading-relaxed">
          Join FinOS for free. No credit card, no commitment. Start making smarter decisions with AI on your side.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register" className="bg-white text-blue-600 font-bold px-8 py-3.5 rounded-2xl hover:bg-blue-50 transition-colors shadow-xl">
            Create free account →
          </Link>
          <Link to="/login" className="border-2 border-white/40 text-white font-bold px-8 py-3.5 rounded-2xl hover:border-white/70 transition-colors">
            Sign in
          </Link>
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
              AI-powered financial operating system built for India. Manage, grow, and understand your money.
            </p>
            <div className="flex items-center gap-4">
              {["Twitter", "LinkedIn", "YouTube"].map(s => (
                <span key={s} className="text-xs text-gray-600 hover:text-gray-400 cursor-pointer transition-colors">{s}</span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Product</div>
            <ul className="space-y-2.5">
              {[["Features", "#features"], ["Pricing", "#pricing"], ["How it works", "#how"], ["Sign up", "/register"]].map(([label, href]) => (
                <li key={label}>
                  {href.startsWith("#")
                    ? <a href={href} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">{label}</a>
                    : <Link to={href} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">{label}</Link>
                  }
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Legal</div>
            <ul className="space-y-2.5">
              {[["Privacy Policy", "/privacy"], ["Terms & Conditions", "/terms"], ["Refund Policy", "/refund"], ["Contact Us", "/contact"]].map(([label, href]) => (
                <li key={label}>
                  <Link to={href} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} FinOS. All rights reserved. Made with ♥ in India.</p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="bg-white dark:bg-gray-950 min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}