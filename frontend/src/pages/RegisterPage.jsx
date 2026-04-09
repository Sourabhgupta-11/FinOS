import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import GoogleSignInButton from "../components/GoogleSignInButton";
import FuturisticLoader from "../components/FuturisticLoader";
import { Mail, CheckCircle2, RefreshCw } from "lucide-react";
import api from "../utils/api";

function MethodPicker({ onChoose }) {
  return (
    <div className="space-y-3">
      <button onClick={() => onChoose("google")} className="w-full">
        <GoogleSignInButton />
      </button>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      <button
        onClick={() => onChoose("email")}
        className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
      >
        <Mail size={16} />
        Continue with Email & Password
      </button>
    </div>
  );
}

function EmailForm({ onSubmit, loading, error, onBack }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const up = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-xl">{error}</div>
      )}
      <div>
        <label className="label">Full name</label>
        <input className="input" type="text" placeholder="Rahul Sharma" value={form.name} onChange={up("name")} required autoFocus />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={up("email")} required />
      </div>
      <div>
        <label className="label">Password <span className="text-gray-400 font-normal normal-case">(min 8 chars)</span></label>
        <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={up("password")} required minLength={8} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Sending confirmation…" : "Create account →"}
      </button>
      <button type="button" onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
        ← Back to options
      </button>
    </form>
  );
}

function WaitingConfirmation({ email, onResend, resending, resent }) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <FuturisticLoader size={72} label="Awaiting confirmation" />
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5 text-left space-y-2">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <Mail size={15} /> Confirmation email sent
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          We sent a verification link to <strong>{email}</strong>. Click the link in the email to activate your account.
        </p>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3">
        ⏳ <strong>Waiting for confirmation</strong> — your account will be activated once you click the link.
      </div>
      <div className="space-y-2">
        <p className="text-xs text-gray-400 dark:text-gray-500">Didn't receive the email?</p>
        <button
          onClick={onResend}
          disabled={resending || resent}
          className="btn-secondary text-xs flex items-center gap-1.5 mx-auto"
        >
          <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
          {resent ? "Sent! Check your inbox" : resending ? "Sending…" : "Resend confirmation email"}
        </button>
      </div>
    </div>
  );
}

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
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || "Registration failed";
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

  const stepTitles = { picker: "Create account", "email-form": "Create with email", waiting: "Check your inbox" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
      <div className="fixed top-0 left-0 w-96 h-96 bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4"><Logo size={56} /></div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">FinOS</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Start your financial journey</p>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">{stepTitles[step]}</h2>

            {step === "picker" && <MethodPicker onChoose={handleChoose} />}
            {step === "email-form" && (
              <EmailForm onSubmit={handleEmailSubmit} loading={loading} error={error} onBack={() => { setStep("picker"); setError(""); }} />
            )}
            {step === "waiting" && (
              <WaitingConfirmation email={savedEmail} onResend={handleResend} resending={resending} resent={resent} />
            )}
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>

      <footer className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-600 dark:text-gray-400">© {new Date().getFullYear()} FinOS. All rights reserved.</p>
            <nav className="flex items-center gap-6">
              {[["Privacy Policy", "/privacy"], ["Terms", "/terms"], ["Refund", "/refund"], ["Contact", "/contact"]].map(([l, h]) => (
                <a key={h} href={h} className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{l}</a>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}