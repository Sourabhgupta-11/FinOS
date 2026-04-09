import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import Logo from "../components/Logo";
import GoogleSignInButton from "../components/GoogleSignInButton";
import FuturisticLoader from "../components/FuturisticLoader";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.error || "Invalid email or password";
      if (code === "EMAIL_NOT_VERIFIED") {
        setError("Please verify your email before signing in. Check your inbox for the confirmation link.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
      <div className="fixed top-0 left-0 w-96 h-96 bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size={56} />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">FinOS</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Your AI-powered finance OS</p>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Sign in</h2>

            <div className="mb-5">
              <GoogleSignInButton />
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-xl">
                  {error}
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="you@example.com" value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required autoFocus />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="label mb-0">Password</label>
                  <Link to="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Forgot?</Link>
                </div>
                <div className="relative">
                  <input className="input pr-10" type={showPass ? "text" : "password"} placeholder="••••••••"
                    value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
                  <button type="button" onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading
                  ? <><FuturisticLoader size={20} /> <span>Signing in…</span></>
                  : "Sign in →"
                }
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            No account?{" "}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Create one free</Link>
          </p>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-2">
            <Link to="/home" className="hover:text-blue-500 transition-colors">← Back to home</Link>
          </p>
        </div>
      </div>

      <footer className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-600 dark:text-gray-400">© {new Date().getFullYear()} FinOS. All rights reserved.</p>
            <nav className="flex items-center gap-6">
              {[["Privacy Policy", "/privacy"], ["Terms & Conditions", "/terms"], ["Refund Policy", "/refund"], ["Contact Us", "/contact"]].map(([l, h]) => (
                <Link key={h} to={h} className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{l}</Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}