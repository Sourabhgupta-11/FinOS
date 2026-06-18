import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import GoogleSignInButton from "../components/GoogleSignInButton";
import FuturisticLoader from "../components/FuturisticLoader";
import { Mail, CheckCircle2, RefreshCw, Eye, EyeOff, Check, X } from "lucide-react";
import api from "../utils/api";

// ─── Password strength ─────────────────────────────────────────────────────────
function getStrength(password) {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
const STRENGTH_COLORS = ["", "#EF4444", "#F59E0B", "#3B82F6", "#10B981", "#10B981"];

function PasswordStrength({ password }) {
  if (!password) return null;
  const { checks, score } = getStrength(password);

  return (
    <div style={{ marginTop: "8px" }}>
      {/* Bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex: 1, height: "3px", borderRadius: "2px",
              background: i <= score ? STRENGTH_COLORS[score] : "rgba(255,255,255,0.1)",
              transition: "background 0.25s",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "11px", color: STRENGTH_COLORS[score], fontWeight: 600 }}>
          {STRENGTH_LABELS[score]}
        </span>
      </div>

      {/* Checks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
        {[
          [checks.length, "8+ characters"],
          [checks.upper, "Uppercase letter"],
          [checks.lower, "Lowercase letter"],
          [checks.number, "Number"],
          [checks.special, "Special character"],
        ].map(([ok, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            {ok
              ? <Check size={10} style={{ color: "#10B981", flexShrink: 0 }} />
              : <X size={10} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />}
            <span style={{ fontSize: "11px", color: ok ? "#8892A4" : "rgba(136,146,164,0.4)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Method picker ─────────────────────────────────────────────────────────────
function MethodPicker({ onChoose }) {
  return (
    <div className="rp-methods">
      <button onClick={() => onChoose("google")} className="rp-google-btn">
        <GoogleSignInButton />
      </button>
      <div className="rp-divider">
        <span />
        <p>or continue with email</p>
        <span />
      </div>
      <button onClick={() => onChoose("email")} className="rp-email-btn">
        <Mail size={15} />
        Sign up with Email
      </button>
      <p className="rp-hint">
        Google Sign-In is faster and skips email verification.
      </p>
    </div>
  );
}

// ─── Email form ────────────────────────────────────────────────────────────────
function EmailForm({ onSubmit, loading, error, onBack }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const up = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="rp-form">
      {error && <div className="rp-error">{error}</div>}

      <div className="rp-field">
        <label className="rp-label">Full name</label>
        <input
          className="rp-input" type="text" placeholder="Rahul Sharma"
          value={form.name} onChange={up("name")} required autoFocus
        />
      </div>

      <div className="rp-field">
        <label className="rp-label">Email</label>
        <input
          className="rp-input" type="email" placeholder="you@example.com"
          value={form.email} onChange={up("email")} required
        />
      </div>

      <div className="rp-field">
        <label className="rp-label">Password</label>
        <div className="rp-pass-wrap">
          <input
            className="rp-input rp-input--pass"
            type={showPass ? "text" : "password"}
            placeholder="Create a password"
            value={form.password} onChange={up("password")}
            required minLength={8}
          />
          <button
            type="button" className="rp-eye" onClick={() => setShowPass(v => !v)}
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <PasswordStrength password={form.password} />
      </div>

      <button type="submit" className="rp-submit" disabled={loading}>
        {loading ? "Sending verification email…" : "Create my account →"}
      </button>

      <button type="button" onClick={onBack} className="rp-back">
        ← Back to sign-up options
      </button>
    </form>
  );
}

// ─── Waiting for confirmation ──────────────────────────────────────────────────
function WaitingConfirmation({ email, onResend, resending, resent }) {
  return (
    <div className="rp-waiting">
      <div className="rp-waiting-icon">
        <FuturisticLoader size={64} label="Awaiting confirmation" />
      </div>

      <div className="rp-waiting-card">
        <div className="rp-waiting-card-head">
          <Mail size={15} />
          Verification email sent to <strong>{email}</strong>
        </div>
        <p className="rp-waiting-card-body">
          Click the link in the email to activate your account. You'll be taken straight to your dashboard.
        </p>
      </div>

      <div className="rp-spam-notice">
        <span className="rp-spam-icon">📬</span>
        <div>
          <strong>Can't find it?</strong> Check your <strong>Spam</strong> folder or Gmail's <strong>Promotions</strong> tab.
          The email comes from <code>finos.support@gmail.com</code>.
        </div>
      </div>

      <div className="rp-resend-row">
        <p className="rp-resend-label">Still nothing after a minute?</p>
        <button onClick={onResend} disabled={resending || resent} className="rp-resend-btn">
          <RefreshCw size={13} className={resending ? "rp-spin" : ""} />
          {resent ? "Sent! Check your inbox" : resending ? "Sending…" : "Resend verification email"}
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');

  :root {
    --rp-navy: #0A0F1E;
    --rp-navy2: #111827;
    --rp-navy3: #1C2333;
    --rp-gold: #F5A623;
    --rp-blue: #2D6BFF;
    --rp-white: #F0F4FF;
    --rp-muted: #8892A4;
    --rp-border: rgba(255,255,255,0.08);
    --rp-card: rgba(255,255,255,0.04);
    --rp-emerald: #10B981;
    --rp-red: #EF4444;
  }

  .rp-page {
    min-height: 100vh;
    background: var(--rp-navy);
    color: var(--rp-white);
    font-family: 'Inter', sans-serif;
    display: flex; flex-direction: column;
    -webkit-font-smoothing: antialiased;
  }

  .rp-blob1, .rp-blob2 {
    position: fixed; border-radius: 50%; pointer-events: none;
    filter: blur(80px); z-index: 0;
  }
  .rp-blob1 { width: 360px; height: 360px; background: rgba(45,107,255,0.08); top: -120px; left: -120px; }
  .rp-blob2 { width: 320px; height: 320px; background: rgba(245,166,35,0.06); bottom: -100px; right: -100px; }

  .rp-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 80px 16px 40px; position: relative; z-index: 1; }

  .rp-card {
    width: 100%; max-width: 400px;
  }

  .rp-brand {
    display: flex; flex-direction: column; align-items: center; margin-bottom: 28px; text-align: center;
  }
  .rp-brand-name {
    font-family: 'Sora', sans-serif; font-size: 26px; font-weight: 800;
    color: var(--rp-white); margin-top: 10px; letter-spacing: -0.02em;
  }
  .rp-brand-sub { font-size: 13px; color: var(--rp-muted); margin-top: 4px; }

  .rp-glass {
    background: rgba(17,24,39,0.7);
    border: 1px solid var(--rp-border);
    border-radius: 18px;
    padding: 28px 28px 24px;
    backdrop-filter: blur(12px);
  }

  .rp-step-title {
    font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 700;
    color: var(--rp-white); margin-bottom: 20px;
  }

  /* Methods */
  .rp-methods { display: flex; flex-direction: column; gap: 10px; }
  .rp-google-btn { background: none; border: none; padding: 0; cursor: pointer; width: 100%; }
  .rp-divider { display: flex; align-items: center; gap: 10px; }
  .rp-divider span { flex: 1; height: 1px; background: var(--rp-border); }
  .rp-divider p { font-size: 12px; color: var(--rp-muted); white-space: nowrap; }
  .rp-email-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 12px; border-radius: 10px;
    background: var(--rp-card); border: 1px solid var(--rp-border);
    color: var(--rp-white); font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.18s;
  }
  .rp-email-btn:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.15); }
  .rp-hint { font-size: 11px; color: rgba(136,146,164,0.6); text-align: center; }

  /* Form */
  .rp-form { display: flex; flex-direction: column; gap: 16px; }
  .rp-field { display: flex; flex-direction: column; gap: 5px; }
  .rp-label { font-size: 12px; font-weight: 600; color: var(--rp-muted); letter-spacing: 0.02em; }
  .rp-input {
    width: 100%; padding: 11px 14px; border-radius: 8px;
    background: rgba(255,255,255,0.05); border: 1px solid var(--rp-border);
    color: var(--rp-white); font-size: 14px; font-family: 'Inter', sans-serif;
    outline: none; transition: border-color 0.18s;
  }
  .rp-input:focus { border-color: var(--rp-blue); box-shadow: 0 0 0 3px rgba(45,107,255,0.12); }
  .rp-input::placeholder { color: rgba(136,146,164,0.5); }
  .rp-input--pass { padding-right: 44px; }
  .rp-pass-wrap { position: relative; }
  .rp-eye {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--rp-muted); cursor: pointer;
    display: flex; align-items: center; padding: 2px; transition: color 0.15s;
  }
  .rp-eye:hover { color: var(--rp-white); }
  .rp-submit {
    width: 100%; padding: 13px; border-radius: 8px; border: none;
    background: var(--rp-gold); color: #0A0F1E;
    font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.18s; margin-top: 4px;
  }
  .rp-submit:hover:not(:disabled) { background: #f0a020; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(245,166,35,0.25); }
  .rp-submit:disabled { opacity: 0.6; cursor: not-allowed; }
  .rp-back {
    background: none; border: none; color: var(--rp-muted);
    font-size: 12px; cursor: pointer; text-align: left; transition: color 0.15s;
  }
  .rp-back:hover { color: var(--rp-white); }
  .rp-error {
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
    color: #FCA5A5; font-size: 13px; padding: 10px 12px; border-radius: 8px; line-height: 1.5;
  }

  /* Waiting */
  .rp-waiting { display: flex; flex-direction: column; gap: 16px; }
  .rp-waiting-icon { display: flex; justify-content: center; }
  .rp-waiting-card {
    background: rgba(45,107,255,0.06); border: 1px solid rgba(45,107,255,0.15);
    border-radius: 10px; padding: 14px;
  }
  .rp-waiting-card-head {
    display: flex; align-items: center; gap: 7px;
    font-size: 13px; font-weight: 600; color: #93B4FF; margin-bottom: 6px; flex-wrap: wrap;
  }
  .rp-waiting-card-body { font-size: 12px; color: var(--rp-muted); line-height: 1.6; }
  .rp-spam-notice {
    background: rgba(245,166,35,0.06); border: 1px solid rgba(245,166,35,0.15);
    border-radius: 10px; padding: 12px 14px;
    display: flex; gap: 10px; align-items: flex-start;
    font-size: 12px; color: rgba(136,146,164,0.8); line-height: 1.6;
  }
  .rp-spam-icon { font-size: 18px; flex-shrink: 0; }
  .rp-spam-notice strong { color: var(--rp-white); }
  .rp-spam-notice code { font-size: 11px; color: var(--rp-gold); background: var(--rp-card); padding: 1px 5px; border-radius: 4px; }
  .rp-resend-row { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .rp-resend-label { font-size: 12px; color: rgba(136,146,164,0.5); }
  .rp-resend-btn {
    display: flex; align-items: center; gap: 6px;
    background: var(--rp-card); border: 1px solid var(--rp-border);
    color: var(--rp-muted); font-size: 12px; font-weight: 600;
    padding: 8px 16px; border-radius: 8px; cursor: pointer;
    transition: all 0.18s;
  }
  .rp-resend-btn:hover:not(:disabled) { border-color: rgba(255,255,255,0.2); color: var(--rp-white); }
  .rp-resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .rp-spin { animation: spin 0.8s linear infinite; }

  /* Bottom bar */
  .rp-signin-row {
    text-align: center; font-size: 13px; color: var(--rp-muted); margin-top: 16px;
  }
  .rp-signin-row a { color: var(--rp-blue); text-decoration: none; font-weight: 600; }
  .rp-signin-row a:hover { text-decoration: underline; }

  .rp-footer {
    border-top: 1px solid var(--rp-border); position: relative; z-index: 1;
    background: rgba(0,0,0,0.2);
  }
  .rp-footer-inner {
    max-width: 900px; margin: 0 auto; padding: 16px 24px;
    display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;
  }
  .rp-footer-copy { font-size: 11px; color: rgba(136,146,164,0.4); }
  .rp-footer-links { display: flex; gap: 16px; }
  .rp-footer-links a { font-size: 11px; color: rgba(136,146,164,0.4); text-decoration: none; transition: color 0.15s; }
  .rp-footer-links a:hover { color: var(--rp-muted); }
`;

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { loginWithGoogle } = useAuth();
  const [step, setStep] = useState("picker");
  const [savedEmail, setSavedEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleChoose = (method) => {
    if (method === "google") loginWithGoogle();
    else setStep("email-form");
  };

  const handleEmailSubmit = async (formData) => {
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register-pending", formData);
      setSavedEmail(formData.email);
      setStep("waiting");
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || "Registration failed. Please try again.";
      setError(err.response?.status === 409 ? `${msg} Please sign in instead.` : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email: savedEmail });
      setResent(true);
      setTimeout(() => setResent(false), 8000);
    } catch { }
    finally { setResending(false); }
  };

  const stepTitles = {
    picker: "Create your account",
    "email-form": "Sign up with email",
    waiting: "Check your inbox",
  };

  return (
    <>
      <style>{styles}</style>
      <div className="rp-page">
        <div className="rp-blob1" /><div className="rp-blob2" />

        <main className="rp-main">
          <div className="rp-card">
            <div className="rp-brand">
              <Logo size={48} />
              <div className="rp-brand-name">FinOS</div>
              <div className="rp-brand-sub">AI-powered finance for India</div>
            </div>

            <div className="rp-glass">
              <h2 className="rp-step-title">{stepTitles[step]}</h2>

              {step === "picker" && <MethodPicker onChoose={handleChoose} />}
              {step === "email-form" && (
                <EmailForm
                  onSubmit={handleEmailSubmit} loading={loading} error={error}
                  onBack={() => { setStep("picker"); setError(""); }}
                />
              )}
              {step === "waiting" && (
                <WaitingConfirmation
                  email={savedEmail} onResend={handleResend}
                  resending={resending} resent={resent}
                />
              )}
            </div>

            <p className="rp-signin-row">
              Already have an account?{" "}
              <Link to="/login">Sign in</Link>
            </p>
          </div>
        </main>

        <footer className="rp-footer">
          <div className="rp-footer-inner">
            <span className="rp-footer-copy">© {new Date().getFullYear()} FinOS. All rights reserved.</span>
            <nav className="rp-footer-links">
              {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Refund", "/refund"], ["Contact", "/contact"]].map(([l, h]) => (
                <a key={h} href={h}>{l}</a>
              ))}
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
}