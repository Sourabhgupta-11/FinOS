import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import GoogleSignInButton from "../components/GoogleSignInButton";
import FuturisticLoader from "../components/FuturisticLoader";
import { Eye, EyeOff, Shield, Check } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.error || "Invalid email or password";
      setError(code === "EMAIL_NOT_VERIFIED"
        ? "Please verify your email before signing in. Check your inbox for the confirmation link."
        : msg);
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="auth-page">
        <div className="auth-orb auth-orb1" /><div className="auth-orb auth-orb2" />

        {/* Left brand panel — desktop only */}
        <aside className="auth-side">
          <Link to="/" className="auth-side-brand"><Logo size={34} /><span>FinOS</span></Link>
          <div className="auth-side-content">
            <h2 className="auth-side-h2">Welcome back.<br />Your money missed you.</h2>
            <p className="auth-side-p">Sign in to pick up where you left off — your dashboard, advisor, and plan are exactly as you saved them.</p>

            <ul className="auth-side-list">
              <li><Check size={15} /><span>Pick up your salary allocation instantly</span></li>
              <li><Check size={15} /><span>Continue your AI advisor conversation</span></li>
              <li><Check size={15} /><span>Track changes to your net worth</span></li>
            </ul>

            <div className="auth-side-trust">
              <Shield size={13} /><span>Bank-grade encryption · Your data is never sold</span>
            </div>
          </div>
        </aside>

        {/* Right form panel */}
        <main className="auth-main">
          <div className="auth-main-top">
            <Link to="/" className="auth-mobile-brand"><Logo size={30} /><span>FinOS</span></Link>
          </div>

          <div className="auth-card-wrap">
            <div className="auth-card">
              <h1 className="auth-card-title">Sign in</h1>
              <p className="auth-card-sub">Welcome back — let's get you to your dashboard.</p>

              <div className="auth-methods">
                <div className="google-wrap"><GoogleSignInButton /></div>
                <div className="auth-divider"><span /><p>or continue with email</p><span /></div>
              </div>

              <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "16px" }}>
                {error && <div className="auth-error">{error}</div>}

                <div className="field">
                  <label className="field-label">Email address</label>
                  <input
                    className="field-input" type="email" placeholder="you@example.com"
                    value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                    required autoFocus
                  />
                </div>

                <div className="field">
                  <div className="field-label-row">
                    <label className="field-label">Password</label>
                    <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
                  </div>
                  <div className="pass-wrap">
                    <input
                      className="field-input field-input--pass"
                      type={showPass ? "text" : "password"}
                      placeholder="Enter your password"
                      value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                      required
                    />
                    <button type="button" className="pass-eye" onClick={() => setShowPass(v => !v)} aria-label={showPass ? "Hide password" : "Show password"}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading
                    ? <span className="submit-loading"><FuturisticLoader size={18} /> Signing in…</span>
                    : "Sign in →"}
                </button>
              </form>
            </div>

            <p className="auth-signin-row">No account? <Link to="/register">Create one free</Link></p>
          </div>

          <footer className="auth-footer">
            <span>© {new Date().getFullYear()} FinOS. All rights reserved.</span>
            <nav className="auth-footer-links">
              {[["Privacy", "/privacy"], ["Terms", "/terms"], ["Refund", "/refund"], ["Contact", "/contact"]].map(([l, h]) => (
                <Link key={h} to={h}>{l}</Link>
              ))}
            </nav>
          </footer>
        </main>
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');

*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
html { font-size:16px; }

:root {
  --g:#F5A623; --gd:#E09515; --ga:rgba(245,166,35,0.12); --gb:rgba(245,166,35,0.22);
  --b:#3B7BFF; --bd:#2563EB; --ba:rgba(59,123,255,0.12);
  --gr:#10B981; --rd:#EF4444;
  --w:#EEF3FF; --mu:#7A859A;
  --br:rgba(255,255,255,0.08); --card:rgba(255,255,255,0.04);
}

.auth-page { min-height:100vh; display:grid; grid-template-columns:1fr 1fr; background:#0B1120; color:var(--w); font-family:'Inter',sans-serif; -webkit-font-smoothing:antialiased; position:relative; overflow:hidden; }

.auth-orb { position:absolute; border-radius:50%; pointer-events:none; filter:blur(90px); }
.auth-orb1 { width:480px; height:480px; background:rgba(59,123,255,0.08); top:-160px; left:-140px; animation:aorb1 16s ease-in-out infinite; }
.auth-orb2 { width:420px; height:420px; background:rgba(245,166,35,0.06); bottom:-140px; right:-120px; animation:aorb2 18s ease-in-out infinite; }
@keyframes aorb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,30px)} }
@keyframes aorb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,-25px)} }

.auth-side { position:relative; z-index:1; background:linear-gradient(160deg,#0F1829 0%,#0B1120 100%); border-right:1px solid var(--br); padding:48px 56px; display:flex; flex-direction:column; }
.auth-side-brand { display:flex; align-items:center; gap:10px; font-family:'Sora',sans-serif; font-size:21px; font-weight:800; color:var(--w); text-decoration:none; margin-bottom:auto; }
.auth-side-content { display:flex; flex-direction:column; justify-content:center; flex:1; max-width:420px; }
.auth-side-h2 { font-family:'Sora',sans-serif; font-size:36px; font-weight:800; line-height:1.2; color:var(--w); margin-bottom:18px; letter-spacing:-0.01em; }
.auth-side-p { font-size:15px; color:var(--mu); line-height:1.7; margin-bottom:32px; }
.auth-side-list { display:flex; flex-direction:column; gap:14px; margin-bottom:32px; list-style:none; padding:0; }
.auth-side-list li { display:flex; align-items:center; gap:11px; font-size:14px; color:var(--w); }
.auth-side-list li svg { color:var(--g); flex-shrink:0; }
.auth-side-trust { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--mu); }
.auth-side-trust svg { color:var(--gr); flex-shrink:0; }

.auth-main { position:relative; z-index:1; display:flex; flex-direction:column; padding:32px 24px 28px; overflow-y:auto; }
.auth-main-top { display:none; }
.auth-mobile-brand { display:flex; align-items:center; gap:9px; font-family:'Sora',sans-serif; font-size:19px; font-weight:800; color:var(--w); text-decoration:none; }

.auth-card-wrap { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; max-width:400px; margin:0 auto; }

.auth-card { width:100%; background:rgba(17,24,39,0.6); border:1px solid var(--br); border-radius:18px; padding:30px 28px 26px; backdrop-filter:blur(14px); }
.auth-card-title { font-family:'Sora',sans-serif; font-size:21px; font-weight:800; color:var(--w); margin-bottom:6px; letter-spacing:-0.01em; }
.auth-card-sub { font-size:13px; color:var(--mu); line-height:1.5; margin-bottom:24px; }

.auth-methods { display:flex; flex-direction:column; gap:12px; }
.google-wrap { width:100%; }
.auth-divider { display:flex; align-items:center; gap:10px; }
.auth-divider span { flex:1; height:1px; background:var(--br); }
.auth-divider p { font-size:12px; color:var(--mu); white-space:nowrap; }

.auth-form { display:flex; flex-direction:column; gap:16px; }
.field { display:flex; flex-direction:column; gap:6px; }
.field-label { font-size:12px; font-weight:600; color:var(--mu); letter-spacing:0.01em; }
.field-label-row { display:flex; justify-content:space-between; align-items:baseline; }
.forgot-link { font-size:12px; color:var(--b); text-decoration:none; font-weight:600; }
.forgot-link:hover { text-decoration:underline; }
.field-input { width:100%; min-height:44px; padding:11px 14px; border-radius:9px; background:rgba(255,255,255,0.05); border:1px solid var(--br); color:var(--w); font-size:14px; font-family:'Inter',sans-serif; outline:none; transition:border-color 0.18s,box-shadow 0.18s; }
.field-input:focus { border-color:var(--b); box-shadow:0 0 0 3px rgba(59,123,255,0.14); }
.field-input::placeholder { color:rgba(122,133,154,0.5); }
.field-input--pass { padding-right:46px; }
.pass-wrap { position:relative; }
.pass-eye { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--mu); cursor:pointer; display:flex; align-items:center; padding:6px; transition:color 0.15s; min-width:28px; min-height:28px; justify-content:center; }
.pass-eye:hover { color:var(--w); }
.pass-eye:focus-visible { outline:2px solid var(--g); outline-offset:1px; border-radius:4px; }

.submit-btn { width:100%; min-height:46px; padding:13px; border-radius:9px; border:none; background:var(--g); color:#0B1120; font-family:'Sora',sans-serif; font-size:14px; font-weight:700; cursor:pointer; transition:all 0.18s; }
.submit-btn:hover:not(:disabled) { background:var(--gd); transform:translateY(-1px); box-shadow:0 10px 26px rgba(245,166,35,0.28); }
.submit-btn:disabled { opacity:0.6; cursor:not-allowed; }
.submit-btn:focus-visible { outline:2px solid var(--g); outline-offset:2px; }
.submit-loading { display:flex; align-items:center; justify-content:center; gap:8px; }

.auth-error { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.22); color:#FCA5A5; font-size:13px; padding:11px 13px; border-radius:9px; line-height:1.5; }

.auth-signin-row { text-align:center; font-size:13px; color:var(--mu); margin-top:18px; }
.auth-signin-row a { color:var(--b); text-decoration:none; font-weight:600; }
.auth-signin-row a:hover { text-decoration:underline; }

.auth-footer { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; padding-top:24px; font-size:11px; color:rgba(122,133,154,0.45); max-width:400px; margin:0 auto; width:100%; }
.auth-footer-links { display:flex; gap:14px; }
.auth-footer-links a { color:rgba(122,133,154,0.45); text-decoration:none; transition:color 0.18s; }
.auth-footer-links a:hover { color:var(--mu); }

@media (max-width:980px) {
  .auth-page { grid-template-columns:1fr; }
  .auth-side { display:none; }
  .auth-main-top { display:flex; justify-content:center; padding-bottom:20px; }
  .auth-main { padding:24px 20px 24px; min-height:100vh; }
}
@media (max-width:420px) {
  .auth-card { padding:24px 20px 22px; }
}
@media (prefers-reduced-motion:reduce) {
  *,*::before,*::after { animation-duration:0.01ms!important; transition-duration:0.01ms!important; }
}
`;