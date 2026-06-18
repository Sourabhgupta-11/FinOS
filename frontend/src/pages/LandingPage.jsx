import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { Crown, Zap, Check, X, Flame, ArrowRight, TrendingUp, Shield, Brain, ChevronDown } from "lucide-react";

// ─── Typewriter effect ─────────────────────────────────────────────────────────
function Typewriter({ words }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[index % words.length];
    const speed = deleting ? 40 : 80;
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(word.slice(0, text.length + 1));
        if (text.length + 1 === word.length) setTimeout(() => setDeleting(true), 1800);
      } else {
        setText(word.slice(0, text.length - 1));
        if (text.length === 0) { setDeleting(false); setIndex(i => i + 1); }
      }
    }, speed);
    return () => clearTimeout(timeout);
  }, [text, deleting, index, words]);

  return (
    <span className="finos-gold">
      {text}<span className="finos-cursor">|</span>
    </span>
  );
}

// ─── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, prefix = "", suffix = "", duration = 1800 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal(Math.floor(ease * to));
          if (p < 1) requestAnimationFrame(tick);
          else setVal(to);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{prefix}{val.toLocaleString("en-IN")}{suffix}</span>;
}

// ─── Dashboard preview card ────────────────────────────────────────────────────
function DashboardPreview() {
  const [activeChat, setActiveChat] = useState(0);
  const chats = [
    { q: "Where is my salary going?", a: "You spend 34% on food & transport. Cutting ₹3,000/month adds ₹36,000/year to savings." },
    { q: "Should I invest in NPS?", a: "Yes — at your tax bracket, NPS saves ₹15,600/year. Start with ₹5,000/month." },
    { q: "Am I ready to buy a home?", a: "Your EMI would be 42% of income. Ideally under 35%. Build corpus for 2 more years." },
  ];

  useEffect(() => {
    const t = setInterval(() => setActiveChat(i => (i + 1) % chats.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="finos-preview-shell">
      {/* Top bar */}
      <div className="finos-preview-topbar">
        <div className="finos-preview-dots">
          <span /><span /><span />
        </div>
        <span className="finos-preview-url">fin-os-ten.vercel.app/dashboard</span>
      </div>

      {/* Dashboard layout */}
      <div className="finos-preview-body">
        {/* Sidebar */}
        <div className="finos-preview-sidebar">
          <div className="finos-preview-logo-sm">FinOS</div>
          {["Dashboard", "AI Advisor", "Allocator", "Portfolio", "Expenses"].map((item, i) => (
            <div key={item} className={`finos-preview-nav-item ${i === 1 ? "active" : ""}`}>{item}</div>
          ))}
        </div>

        {/* Main */}
        <div className="finos-preview-main">
          {/* Net worth card */}
          <div className="finos-preview-networth">
            <div className="finos-preview-nw-label">Net Worth</div>
            <div className="finos-preview-nw-value">₹12,84,320</div>
            <div className="finos-preview-nw-change">↑ +8.4% this month</div>
            <div className="finos-preview-sparkline">
              <svg viewBox="0 0 120 30" className="finos-preview-svg">
                <polyline points="0,25 20,20 40,22 60,12 80,15 100,8 120,5" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="0,25 20,20 40,22 60,12 80,15 100,8 120,5 120,30 0,30" fill="url(#goldGrad)" opacity="0.2"/>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5A623"/>
                    <stop offset="100%" stopColor="#F5A623" stopOpacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* AI Chat */}
          <div className="finos-preview-chat">
            <div className="finos-preview-chat-header">
              <Brain size={12} className="finos-preview-chat-icon" />
              <span>AI Advisor</span>
            </div>
            <div className="finos-preview-chat-bubble user">{chats[activeChat].q}</div>
            <div className="finos-preview-chat-bubble ai">{chats[activeChat].a}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`finos-nav ${scrolled ? "finos-nav--scrolled" : ""}`}>
      <div className="finos-nav-inner">
        <Link to="/" className="finos-nav-brand">
          <Logo size={32} />
          <span>FinOS</span>
        </Link>

        <div className="finos-nav-links">
          {[["Features", "#features"], ["Pricing", "#pricing"], ["How it works", "#how"], ["Contact", "/contact"]].map(([label, href]) =>
            href.startsWith("#") ? (
              <a key={label} href={href} className="finos-nav-link">{label}</a>
            ) : (
              <Link key={label} to={href} className="finos-nav-link">{label}</Link>
            )
          )}
        </div>

        <div className="finos-nav-ctas">
          <Link to="/login" className="finos-nav-signin">Sign in</Link>
          <Link to="/register" className="finos-btn-primary finos-btn-sm">Get started free</Link>
        </div>

        <button className="finos-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
          <span className={menuOpen ? "open" : ""} /><span className={menuOpen ? "open" : ""} /><span className={menuOpen ? "open" : ""} />
        </button>
      </div>

      {menuOpen && (
        <div className="finos-mobile-menu">
          {[["Features", "#features"], ["Pricing", "#pricing"], ["How it works", "#how"]].map(([label, href]) => (
            <a key={label} href={href} className="finos-mobile-link" onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
          <div className="finos-mobile-ctas">
            <Link to="/login" className="finos-btn-ghost finos-btn-sm" onClick={() => setMenuOpen(false)}>Sign in</Link>
            <Link to="/register" className="finos-btn-primary finos-btn-sm" onClick={() => setMenuOpen(false)}>Get started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="finos-hero">
      <div className="finos-hero-inner">
        <div className="finos-hero-text">
          <div className="finos-eyebrow">
            <Flame size={13} />
            Early access · Special pricing active
          </div>

          <h1 className="finos-hero-h1">
            Stop guessing.<br />
            Start <Typewriter words={["investing.", "saving.", "growing.", "planning."]} />
          </h1>

          <p className="finos-hero-sub">
            FinOS is an AI-powered finance OS built for India. It tells you exactly where your money should go — and why.
          </p>

          <div className="finos-hero-actions">
            <Link to="/register" className="finos-btn-primary finos-btn-lg">
              Start free — no card needed <ArrowRight size={16} />
            </Link>
            <a href="#features" className="finos-btn-ghost finos-btn-lg">
              See what's inside <ChevronDown size={16} />
            </a>
          </div>

          <div className="finos-hero-trust">
            {[
              [<Shield size={13} />, "Bank-grade security"],
              [<Check size={13} />, "No credit card ever"],
              [<Check size={13} />, "Cancel anytime"],
            ].map(([icon, text], i) => (
              <div key={i} className="finos-trust-item">{icon}<span>{text}</span></div>
            ))}
          </div>
        </div>

        <div className="finos-hero-visual">
          <DashboardPreview />
        </div>
      </div>

      {/* Stats bar */}
      <div className="finos-stats-bar">
        {[
          ["₹0", "Free forever plan"],
          ["10+", "Finance tools"],
          ["AI", "Advisor included"],
          ["India", "Built for ₹ users"],
        ].map(([val, label]) => (
          <div key={label} className="finos-stat">
            <div className="finos-stat-val">{val}</div>
            <div className="finos-stat-label">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "🤖", title: "AI Financial Advisor", desc: "Ask anything about your money. Get advice tailored to your income, goals, and tax bracket — not generic tips.", tag: "Free", tagColor: "emerald" },
  { icon: "📊", title: "Salary Allocator", desc: "Enter your salary. FinOS splits it optimally across needs, investments, and savings based on your risk profile.", tag: "Free", tagColor: "emerald" },
  { icon: "🧮", title: "Decision Simulator", desc: "Thinking of a loan? New job? FinOS models the impact before you commit — months ahead, in plain numbers.", tag: "Pro", tagColor: "blue" },
  { icon: "💳", title: "Expense Tracker", desc: "Log and categorise spending. See patterns, catch waste, and get nudged before you overshoot.", tag: "Pro", tagColor: "blue" },
  { icon: "📈", title: "Portfolio Tracker", desc: "Mutual funds, stocks, FDs — all in one place with live NSE prices and a unified net worth view.", tag: "Premium", tagColor: "gold" },
  { icon: "📑", title: "Tax Calculator", desc: "Old regime vs new regime, side by side. Find the deductions you're missing and reduce your tax legally.", tag: "Premium", tagColor: "gold" },
  { icon: "🎯", title: "Budget Manager", desc: "Set category limits. Get real-time alerts at 80% and 100% so you never blow the budget silently.", tag: "Premium", tagColor: "gold" },
  { icon: "🏦", title: "Bank Linking", desc: "Securely connect your bank via Setu AA and auto-import transactions — no manual entry.", tag: "Pro", tagColor: "blue", soon: true },
];

function Features() {
  return (
    <section id="features" className="finos-section finos-section--alt">
      <div className="finos-container">
        <div className="finos-section-header">
          <div className="finos-eyebrow finos-eyebrow--center">Everything you need</div>
          <h2 className="finos-section-h2">One dashboard.<br />Your entire financial life.</h2>
          <p className="finos-section-sub">Each tool works alone. Together they give you something no spreadsheet can — a full picture with AI context.</p>
        </div>

        <div className="finos-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className={`finos-feature-card ${f.soon ? "finos-feature-card--soon" : ""}`}>
              {f.soon && <div className="finos-soon-badge">Coming soon</div>}
              <div className="finos-feature-top">
                <span className="finos-feature-icon">{f.icon}</span>
                <span className={`finos-tag finos-tag--${f.tagColor}`}>{f.tag}</span>
              </div>
              <h3 className="finos-feature-title">{f.title}</h3>
              <p className="finos-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { title: "Create your account", desc: "Sign up with Google or email. Takes 30 seconds. No payment details, no catch.", detail: "Google Sign-In means one click and you're in." },
    { title: "Tell FinOS about yourself", desc: "Your monthly income, how much you save, your goals. That's it — no forms, no KYC.", detail: "The AI uses this to personalise every recommendation." },
    { title: "Get your financial plan", desc: "FinOS immediately shows where your money should go and what you're missing.", detail: "Salary allocation, investment split, tax optimisation — ready instantly." },
    { title: "Track, ask, improve", desc: "Log expenses, chat with your AI advisor, run simulations. Your finances, always clear.", detail: "Most users find their first blind spot within 10 minutes." },
  ];

  return (
    <section id="how" className="finos-section">
      <div className="finos-container">
        <div className="finos-section-header">
          <div className="finos-eyebrow finos-eyebrow--center">Simple to start</div>
          <h2 className="finos-section-h2">From sign-up to clarity<br />in under 5 minutes.</h2>
        </div>

        <div className="finos-how-grid">
          {steps.map((step, i) => (
            <div key={step.title} className="finos-how-card">
              <div className="finos-how-num">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="finos-how-title">{step.title}</h3>
              <p className="finos-how-desc">{step.desc}</p>
              <p className="finos-how-detail">{step.detail}</p>
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
    key: "free", name: "Free", price: "₹0", period: "forever",
    tagline: "Try everything that matters.",
    features: ["Salary Allocator", "AI Advisor (3 chats/day)", "Financial Health Score", "Net Worth Dashboard", "Goals & Liabilities tracker"],
    missing: ["Decision Simulator", "Expense Tracker", "Tax Calculator", "Budget Manager", "Portfolio Tracker"],
    cta: "Start for free", ctaTo: "/register", style: "ghost",
  },
  {
    key: "pro", name: "Pro", price: "₹99", originalPrice: "₹199", period: "/month",
    tagline: "For people getting serious about money.",
    badge: "50% off · Launch offer",
    features: ["Everything in Free", "AI Advisor (50 chats/day)", "Decision Simulator", "Expense Tracker + CSV export", "Allocation history", "Push notifications", "Bank account linking"],
    missing: ["Tax Calculator", "Budget Manager", "Portfolio Tracker"],
    cta: "Start Pro", ctaTo: "/register", style: "blue", recommended: true,
  },
  {
    key: "premium", name: "Premium", price: "₹199", originalPrice: "₹399", period: "/month",
    tagline: "The full picture. Nothing held back.",
    badge: "50% off · Launch offer",
    features: ["Everything in Pro", "Unlimited AI Advisor", "Tax Calculator (old vs new)", "Budget Manager + alerts", "Portfolio Tracker (live NSE)", "Priority support"],
    missing: [],
    cta: "Start Premium", ctaTo: "/register", style: "gold",
  },
];

function Pricing() {
  return (
    <section id="pricing" className="finos-section finos-section--alt">
      <div className="finos-container">
        <div className="finos-section-header">
          <div className="finos-eyebrow finos-eyebrow--center">Honest pricing</div>
          <h2 className="finos-section-h2">Start free.<br />Upgrade when it earns it.</h2>
          <p className="finos-section-sub">No trials that expire. No surprises. The free plan is genuinely useful — not a teaser.</p>
        </div>

        <div className="finos-pricing-grid">
          {PLANS.map((plan) => (
            <div key={plan.key} className={`finos-plan ${plan.recommended ? "finos-plan--recommended" : ""} finos-plan--${plan.style}`}>
              {plan.recommended && <div className="finos-plan-top-badge">Most popular</div>}

              <div className="finos-plan-header">
                <div className="finos-plan-name">{plan.name}</div>
                <div className="finos-plan-price-row">
                  <span className="finos-plan-price">{plan.price}</span>
                  {plan.originalPrice && <span className="finos-plan-original">{plan.originalPrice}</span>}
                  <span className="finos-plan-period">{plan.period}</span>
                </div>
                {plan.badge && <div className="finos-plan-badge">{plan.badge}</div>}
                <p className="finos-plan-tagline">{plan.tagline}</p>
              </div>

              <ul className="finos-plan-features">
                {plan.features.map(f => (
                  <li key={f} className="finos-plan-feature finos-plan-feature--yes">
                    <Check size={13} /> {f}
                  </li>
                ))}
                {plan.missing.map(f => (
                  <li key={f} className="finos-plan-feature finos-plan-feature--no">
                    <X size={13} /> {f}
                  </li>
                ))}
              </ul>

              <Link to={plan.ctaTo} className={`finos-plan-cta finos-plan-cta--${plan.style}`}>
                {plan.cta} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        <p className="finos-pricing-note">
          Launch pricing applies to your first 6 months. Cancel any time — no questions asked.
        </p>
      </div>
    </section>
  );
}

// ─── Why FinOS ────────────────────────────────────────────────────────────────
function WhyFinOS() {
  return (
    <section className="finos-section finos-section--dark">
      <div className="finos-container">
        <div className="finos-why-grid">
          <div className="finos-why-text">
            <div className="finos-eyebrow">Why we built this</div>
            <h2 className="finos-why-h2">
              Most Indians earn well.<br />
              <span className="finos-gold">Few invest right.</span>
            </h2>
            <p className="finos-why-p">
              We kept seeing the same pattern: smart, employed people with savings rotting in a bank account because finance felt complicated. Advisors are expensive. Spreadsheets are tedious. Apps are shallow.
            </p>
            <p className="finos-why-p">
              FinOS is what we wished existed — a tool that actually understands your income, your goals, and India's financial system, and tells you what to do next.
            </p>
            <Link to="/register" className="finos-btn-primary finos-btn-lg" style={{ marginTop: "2rem", display: "inline-flex" }}>
              Try it free <ArrowRight size={16} />
            </Link>
          </div>

          <div className="finos-why-cards">
            {[
              { icon: "💸", stat: "₹2.1L", label: "Average Indian loses per year by under-investing" },
              { icon: "📉", stat: "68%", label: "Salaried Indians have no equity exposure at all" },
              { icon: "🧾", stat: "₹40K+", label: "Average tax overpayment due to wrong regime choice" },
            ].map(({ icon, stat, label }) => (
              <div key={stat} className="finos-why-card">
                <span className="finos-why-card-icon">{icon}</span>
                <div className="finos-why-stat">{stat}</div>
                <div className="finos-why-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="finos-cta-section">
      <div className="finos-container finos-cta-inner">
        <div className="finos-cta-tag">
          <Flame size={13} /> Early access — special pricing live now
        </div>
        <h2 className="finos-cta-h2">
          Your money deserves<br />better than a savings account.
        </h2>
        <p className="finos-cta-sub">
          Create your free account. No credit card. No commitment. See your financial picture in 5 minutes.
        </p>
        <Link to="/register" className="finos-btn-primary finos-btn-xl">
          Get started free <ArrowRight size={18} />
        </Link>
        <div className="finos-cta-trust">
          {["No card required", "Free plan always available", "Cancel premium anytime"].map(t => (
            <span key={t} className="finos-cta-trust-item"><Check size={13} />{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="finos-footer">
      <div className="finos-container">
        <div className="finos-footer-grid">
          <div className="finos-footer-brand">
            <div className="finos-footer-logo">
              <Logo size={28} />
              <span>FinOS</span>
            </div>
            <p className="finos-footer-tagline">
              AI-powered financial OS built for India.<br />Manage, grow, and understand your money.
            </p>
          </div>

          <div>
            <div className="finos-footer-col-head">Product</div>
            <ul className="finos-footer-links">
              {[["Features", "#features"], ["Pricing", "#pricing"], ["How it works", "#how"], ["Sign up free", "/register"]].map(([l, h]) => (
                <li key={l}>{h.startsWith("#") ? <a href={h}>{l}</a> : <Link to={h}>{l}</Link>}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="finos-footer-col-head">Legal</div>
            <ul className="finos-footer-links">
              {[["Privacy Policy", "/privacy"], ["Terms & Conditions", "/terms"], ["Refund Policy", "/refund"], ["Contact Us", "/contact"]].map(([l, h]) => (
                <li key={l}><Link to={h}>{l}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="finos-footer-bottom">
          <span>© {new Date().getFullYear()} FinOS. Made with ♥ in India.</span>
          <div className="finos-footer-status">
            <span className="finos-status-dot" />All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=Inter:wght@400;500;600&display=swap');

  :root {
    --navy: #0A0F1E;
    --navy-2: #111827;
    --navy-3: #1C2333;
    --gold: #F5A623;
    --gold-dim: rgba(245,166,35,0.12);
    --gold-dim2: rgba(245,166,35,0.06);
    --blue: #2D6BFF;
    --blue-dim: rgba(45,107,255,0.15);
    --white: #F0F4FF;
    --muted: #8892A4;
    --border: rgba(255,255,255,0.07);
    --card: rgba(255,255,255,0.04);
    --card-hover: rgba(255,255,255,0.07);
    --emerald: #10B981;
    --radius: 14px;
    --radius-sm: 8px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .finos-page {
    background: var(--navy);
    color: var(--white);
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  .finos-gold { color: var(--gold); }
  .finos-cursor { animation: blink 1s step-end infinite; color: var(--gold); }
  @keyframes blink { 50% { opacity: 0; } }

  /* ── Nav ── */
  .finos-nav {
    position: fixed; top: 0; inset-inline: 0; z-index: 100;
    transition: background 0.3s, border-color 0.3s, backdrop-filter 0.3s;
    border-bottom: 1px solid transparent;
  }
  .finos-nav--scrolled {
    background: rgba(10,15,30,0.92);
    backdrop-filter: blur(20px);
    border-color: var(--border);
  }
  .finos-nav-inner {
    max-width: 1200px; margin: 0 auto;
    padding: 0 24px; height: 64px;
    display: flex; align-items: center; gap: 32px;
  }
  .finos-nav-brand {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 800;
    color: var(--white); text-decoration: none; flex-shrink: 0;
  }
  .finos-nav-links {
    display: flex; gap: 28px; flex: 1;
  }
  .finos-nav-link {
    font-size: 14px; color: var(--muted); text-decoration: none;
    transition: color 0.2s; font-weight: 500;
  }
  .finos-nav-link:hover { color: var(--white); }
  .finos-nav-ctas { display: flex; align-items: center; gap: 12px; }
  .finos-nav-signin {
    font-size: 14px; font-weight: 600; color: var(--muted);
    text-decoration: none; transition: color 0.2s;
  }
  .finos-nav-signin:hover { color: var(--white); }
  .finos-hamburger {
    display: none; flex-direction: column; gap: 5px;
    background: none; border: none; cursor: pointer; padding: 4px;
  }
  .finos-hamburger span {
    display: block; width: 22px; height: 2px;
    background: var(--white); border-radius: 2px;
    transition: all 0.25s;
  }
  .finos-hamburger span.open:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .finos-hamburger span.open:nth-child(2) { opacity: 0; }
  .finos-hamburger span.open:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
  .finos-mobile-menu {
    background: var(--navy-2); border-top: 1px solid var(--border);
    padding: 16px 24px 20px; display: flex; flex-direction: column; gap: 12px;
  }
  .finos-mobile-link {
    font-size: 15px; color: var(--muted); text-decoration: none; padding: 4px 0;
  }
  .finos-mobile-ctas { display: flex; gap: 10px; margin-top: 8px; }

  /* ── Buttons ── */
  .finos-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--gold); color: #0A0F1E;
    font-family: 'Sora', sans-serif; font-weight: 700;
    text-decoration: none; border: none; cursor: pointer;
    border-radius: var(--radius-sm); transition: all 0.18s;
  }
  .finos-btn-primary:hover { background: #f0a020; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(245,166,35,0.3); }
  .finos-btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--card); color: var(--white);
    border: 1px solid var(--border); font-weight: 600;
    text-decoration: none; border-radius: var(--radius-sm); transition: all 0.18s;
  }
  .finos-btn-ghost:hover { background: var(--card-hover); border-color: rgba(255,255,255,0.15); }
  .finos-btn-sm { font-size: 13px; padding: 8px 16px; }
  .finos-btn-lg { font-size: 15px; padding: 13px 24px; }
  .finos-btn-xl { font-size: 17px; padding: 16px 36px; border-radius: 12px; }

  /* ── Eyebrow ── */
  .finos-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--gold);
    background: var(--gold-dim); border: 1px solid rgba(245,166,35,0.2);
    padding: 5px 12px; border-radius: 100px; margin-bottom: 20px;
  }
  .finos-eyebrow--center { margin-inline: auto; }

  /* ── Section ── */
  .finos-section { padding: 96px 0; }
  .finos-section--alt { background: var(--navy-2); }
  .finos-section--dark { background: #060B16; }
  .finos-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
  .finos-section-header { text-align: center; margin-bottom: 56px; display: flex; flex-direction: column; align-items: center; }
  .finos-section-h2 {
    font-family: 'Sora', sans-serif; font-size: clamp(32px, 4vw, 48px);
    font-weight: 800; line-height: 1.15; color: var(--white);
    margin-bottom: 16px;
  }
  .finos-section-sub { color: var(--muted); font-size: 17px; max-width: 540px; line-height: 1.6; }

  /* ── Hero ── */
  .finos-hero {
    min-height: 100vh; padding-top: 64px;
    display: flex; flex-direction: column;
  }
  .finos-hero-inner {
    max-width: 1200px; margin: 0 auto; padding: 80px 24px 60px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;
    flex: 1;
  }
  .finos-hero-h1 {
    font-family: 'Sora', sans-serif;
    font-size: clamp(36px, 5vw, 60px);
    font-weight: 800; line-height: 1.1;
    color: var(--white); margin-bottom: 20px;
    letter-spacing: -0.02em;
  }
  .finos-hero-sub {
    font-size: 18px; color: var(--muted); line-height: 1.65;
    margin-bottom: 36px; max-width: 440px;
  }
  .finos-hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 32px; }
  .finos-hero-trust { display: flex; gap: 20px; flex-wrap: wrap; }
  .finos-trust-item {
    display: flex; align-items: center; gap: 6px;
    font-size: 13px; color: var(--muted);
  }
  .finos-trust-item svg { color: var(--emerald); }

  /* ── Stats bar ── */
  .finos-stats-bar {
    border-top: 1px solid var(--border);
    display: grid; grid-template-columns: repeat(4, 1fr);
    max-width: 1200px; margin: 0 auto; width: 100%;
    padding: 0 24px;
  }
  .finos-stat {
    padding: 28px 0; text-align: center;
    border-right: 1px solid var(--border);
  }
  .finos-stat:last-child { border-right: none; }
  .finos-stat-val {
    font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 800;
    color: var(--gold); margin-bottom: 4px;
  }
  .finos-stat-label { font-size: 12px; color: var(--muted); }

  /* ── Dashboard preview ── */
  .finos-preview-shell {
    background: var(--navy-2);
    border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px var(--border);
    transform: perspective(1000px) rotateY(-4deg) rotateX(2deg);
    transition: transform 0.4s ease;
  }
  .finos-preview-shell:hover { transform: perspective(1000px) rotateY(0deg) rotateX(0deg); }
  .finos-preview-topbar {
    display: flex; align-items: center; gap: 10px;
    background: var(--navy-3); padding: 10px 14px;
    border-bottom: 1px solid var(--border);
  }
  .finos-preview-dots { display: flex; gap: 5px; }
  .finos-preview-dots span {
    width: 10px; height: 10px; border-radius: 50%;
  }
  .finos-preview-dots span:nth-child(1) { background: #FF5F57; }
  .finos-preview-dots span:nth-child(2) { background: #FEBC2E; }
  .finos-preview-dots span:nth-child(3) { background: #28C840; }
  .finos-preview-url {
    font-size: 11px; color: var(--muted); font-family: monospace;
  }
  .finos-preview-body { display: grid; grid-template-columns: 110px 1fr; min-height: 300px; }
  .finos-preview-sidebar {
    background: rgba(0,0,0,0.3);
    border-right: 1px solid var(--border);
    padding: 14px 10px; display: flex; flex-direction: column; gap: 4px;
  }
  .finos-preview-logo-sm {
    font-family: 'Sora', sans-serif; font-size: 12px; font-weight: 800;
    color: var(--gold); margin-bottom: 12px; padding-left: 4px;
  }
  .finos-preview-nav-item {
    font-size: 10px; color: var(--muted); padding: 5px 8px;
    border-radius: 5px; transition: all 0.15s;
  }
  .finos-preview-nav-item.active {
    background: var(--gold-dim); color: var(--gold); font-weight: 600;
  }
  .finos-preview-main { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
  .finos-preview-networth {
    background: var(--navy-3); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px 14px;
  }
  .finos-preview-nw-label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
  .finos-preview-nw-value { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 800; color: var(--white); }
  .finos-preview-nw-change { font-size: 10px; color: var(--emerald); margin-top: 2px; }
  .finos-preview-sparkline { margin-top: 8px; }
  .finos-preview-svg { width: 100%; height: 32px; }
  .finos-preview-chat {
    background: var(--navy-3); border: 1px solid var(--border);
    border-radius: 10px; padding: 10px 12px; flex: 1;
  }
  .finos-preview-chat-header {
    display: flex; align-items: center; gap: 5px;
    font-size: 9px; font-weight: 700; color: var(--gold);
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;
  }
  .finos-preview-chat-icon { color: var(--gold); }
  .finos-preview-chat-bubble {
    font-size: 10px; line-height: 1.5; border-radius: 6px;
    padding: 6px 8px; margin-bottom: 6px; transition: all 0.3s;
  }
  .finos-preview-chat-bubble.user {
    background: var(--blue-dim); color: #93B4FF;
    border: 1px solid rgba(45,107,255,0.2); text-align: right;
  }
  .finos-preview-chat-bubble.ai {
    background: var(--gold-dim2); color: var(--muted);
    border: 1px solid rgba(245,166,35,0.1);
  }

  /* ── Features ── */
  .finos-features-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
  }
  .finos-feature-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 22px;
    transition: all 0.2s; position: relative; overflow: hidden;
  }
  .finos-feature-card:hover {
    background: var(--card-hover);
    border-color: rgba(255,255,255,0.12);
    transform: translateY(-2px);
  }
  .finos-feature-card--soon { opacity: 0.6; }
  .finos-soon-badge {
    position: absolute; top: 10px; right: 10px;
    background: rgba(245,166,35,0.15); color: var(--gold);
    border: 1px solid rgba(245,166,35,0.25);
    font-size: 9px; font-weight: 700; letter-spacing: 0.05em;
    text-transform: uppercase; padding: 3px 8px; border-radius: 100px;
  }
  .finos-feature-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .finos-feature-icon { font-size: 26px; }
  .finos-feature-title { font-weight: 700; font-size: 14px; color: var(--white); margin-bottom: 8px; }
  .finos-feature-desc { font-size: 12px; color: var(--muted); line-height: 1.6; }

  .finos-tag { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 100px; }
  .finos-tag--emerald { background: rgba(16,185,129,0.12); color: var(--emerald); border: 1px solid rgba(16,185,129,0.2); }
  .finos-tag--blue { background: rgba(45,107,255,0.12); color: #93B4FF; border: 1px solid rgba(45,107,255,0.2); }
  .finos-tag--gold { background: var(--gold-dim); color: var(--gold); border: 1px solid rgba(245,166,35,0.2); }

  /* ── How it works ── */
  .finos-how-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .finos-how-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 28px 22px;
    position: relative;
  }
  .finos-how-num {
    font-family: 'Sora', sans-serif; font-size: 40px; font-weight: 800;
    color: var(--gold-dim); line-height: 1; margin-bottom: 16px;
    transition: color 0.2s;
  }
  .finos-how-card:hover .finos-how-num { color: rgba(245,166,35,0.3); }
  .finos-how-title { font-weight: 700; font-size: 15px; color: var(--white); margin-bottom: 8px; }
  .finos-how-desc { font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 12px; }
  .finos-how-detail { font-size: 12px; color: rgba(245,166,35,0.7); line-height: 1.5; font-style: italic; }

  /* ── Pricing ── */
  .finos-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .finos-plan {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 28px;
    display: flex; flex-direction: column; position: relative;
    overflow: hidden;
  }
  .finos-plan--recommended {
    border-color: rgba(45,107,255,0.5);
    background: rgba(45,107,255,0.05);
  }
  .finos-plan--gold { border-color: rgba(245,166,35,0.3); background: rgba(245,166,35,0.03); }
  .finos-plan-top-badge {
    position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    background: var(--blue); color: #fff;
    font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
    padding: 4px 14px; border-radius: 0 0 8px 8px; text-transform: uppercase;
  }
  .finos-plan-header { padding-top: 8px; margin-bottom: 24px; }
  .finos-plan-name {
    font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 10px;
  }
  .finos-plan--recommended .finos-plan-name { color: #93B4FF; }
  .finos-plan--gold .finos-plan-name { color: var(--gold); }
  .finos-plan-price-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
  .finos-plan-price {
    font-family: 'Sora', sans-serif; font-size: 42px; font-weight: 800; color: var(--white);
  }
  .finos-plan-original { font-size: 16px; color: var(--muted); text-decoration: line-through; }
  .finos-plan-period { font-size: 14px; color: var(--muted); }
  .finos-plan-badge {
    display: inline-block; font-size: 10px; font-weight: 700;
    background: rgba(16,185,129,0.12); color: var(--emerald);
    border: 1px solid rgba(16,185,129,0.2);
    padding: 3px 10px; border-radius: 100px; margin-bottom: 10px;
  }
  .finos-plan-tagline { font-size: 13px; color: var(--muted); line-height: 1.5; }
  .finos-plan-features { list-style: none; display: flex; flex-direction: column; gap: 9px; flex: 1; margin-bottom: 24px; }
  .finos-plan-feature { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; line-height: 1.4; }
  .finos-plan-feature--yes { color: var(--white); }
  .finos-plan-feature--yes svg { color: var(--emerald); flex-shrink: 0; margin-top: 2px; }
  .finos-plan-feature--no { color: rgba(136,146,164,0.4); }
  .finos-plan-feature--no svg { color: rgba(136,146,164,0.3); flex-shrink: 0; margin-top: 2px; }
  .finos-plan-cta {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 12px 20px; border-radius: var(--radius-sm); font-weight: 700; font-size: 14px;
    text-decoration: none; transition: all 0.18s; margin-top: auto;
  }
  .finos-plan-cta--ghost { background: var(--card-hover); color: var(--white); border: 1px solid var(--border); }
  .finos-plan-cta--ghost:hover { border-color: rgba(255,255,255,0.2); }
  .finos-plan-cta--blue { background: var(--blue); color: #fff; }
  .finos-plan-cta--blue:hover { background: #1a5bff; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(45,107,255,0.3); }
  .finos-plan-cta--gold { background: var(--gold); color: #0A0F1E; }
  .finos-plan-cta--gold:hover { background: #f0a020; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(245,166,35,0.3); }
  .finos-pricing-note { text-align: center; font-size: 13px; color: var(--muted); margin-top: 28px; }

  /* ── Why ── */
  .finos-why-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
  .finos-why-h2 {
    font-family: 'Sora', sans-serif; font-size: clamp(28px, 3.5vw, 44px);
    font-weight: 800; line-height: 1.2; color: var(--white); margin-bottom: 20px;
  }
  .finos-why-p { font-size: 15px; color: var(--muted); line-height: 1.7; margin-bottom: 14px; }
  .finos-why-cards { display: flex; flex-direction: column; gap: 14px; }
  .finos-why-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 20px 22px;
    display: grid; grid-template-columns: 36px 1fr; column-gap: 14px; row-gap: 4px; align-items: start;
  }
  .finos-why-card-icon { font-size: 22px; grid-row: span 2; display: flex; align-items: center; }
  .finos-why-stat { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 800; color: var(--gold); }
  .finos-why-label { font-size: 12px; color: var(--muted); line-height: 1.4; }

  /* ── CTA ── */
  .finos-cta-section {
    padding: 96px 0;
    background: radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.12) 0%, transparent 60%), var(--navy);
    border-top: 1px solid var(--border);
  }
  .finos-cta-inner { text-align: center; display: flex; flex-direction: column; align-items: center; }
  .finos-cta-tag {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--gold); background: var(--gold-dim); border: 1px solid rgba(245,166,35,0.2);
    padding: 5px 14px; border-radius: 100px; margin-bottom: 24px;
  }
  .finos-cta-h2 {
    font-family: 'Sora', sans-serif; font-size: clamp(32px, 4vw, 52px);
    font-weight: 800; line-height: 1.15; color: var(--white); margin-bottom: 16px;
  }
  .finos-cta-sub { font-size: 17px; color: var(--muted); line-height: 1.6; max-width: 480px; margin-bottom: 36px; }
  .finos-cta-trust { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; margin-top: 20px; }
  .finos-cta-trust-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
  .finos-cta-trust-item svg { color: var(--emerald); }

  /* ── Footer ── */
  .finos-footer { background: #060B16; border-top: 1px solid var(--border); padding: 64px 0 32px; }
  .finos-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 48px; margin-bottom: 48px; }
  .finos-footer-logo {
    display: flex; align-items: center; gap: 8px;
    font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 800;
    color: var(--white); margin-bottom: 12px;
  }
  .finos-footer-tagline { font-size: 13px; color: var(--muted); line-height: 1.6; }
  .finos-footer-col-head { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 16px; }
  .finos-footer-links { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .finos-footer-links a { font-size: 13px; color: rgba(136,146,164,0.7); text-decoration: none; transition: color 0.2s; }
  .finos-footer-links a:hover { color: var(--white); }
  .finos-footer-bottom {
    border-top: 1px solid var(--border); padding-top: 24px;
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
    font-size: 12px; color: rgba(136,146,164,0.5);
  }
  .finos-footer-status { display: flex; align-items: center; gap: 7px; }
  .finos-status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--emerald); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

  /* ── Responsive ── */
  @media (max-width: 1024px) {
    .finos-features-grid { grid-template-columns: repeat(2, 1fr); }
    .finos-how-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 768px) {
    .finos-nav-links, .finos-nav-ctas { display: none; }
    .finos-hamburger { display: flex; }
    .finos-hero-inner { grid-template-columns: 1fr; padding: 48px 24px 40px; gap: 40px; }
    .finos-hero-visual { order: -1; }
    .finos-preview-shell { transform: none; }
    .finos-stats-bar { grid-template-columns: repeat(2, 1fr); }
    .finos-stat { border-right: none; border-bottom: 1px solid var(--border); }
    .finos-stat:nth-child(odd) { border-right: 1px solid var(--border); }
    .finos-features-grid { grid-template-columns: 1fr; }
    .finos-how-grid { grid-template-columns: 1fr; }
    .finos-pricing-grid { grid-template-columns: 1fr; }
    .finos-why-grid { grid-template-columns: 1fr; gap: 40px; }
    .finos-footer-grid { grid-template-columns: 1fr; gap: 32px; }
    .finos-hero-actions { flex-direction: column; }
    .finos-btn-lg, .finos-btn-xl { width: 100%; justify-content: center; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;

export default function LandingPage() {
  return (
    <>
      <style>{styles}</style>
      <div className="finos-page">
        <Navbar />
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <WhyFinOS />
        <CTA />
        <Footer />
      </div>
    </>
  );
}