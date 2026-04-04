import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Logo from '../components/Logo';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try { await api.post('/email/forgot-password', { email }); }
    catch { /* always show success */ }
    finally { setSent(true); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
      <div className="fixed top-0 left-0 w-96 h-96 bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><Logo size={48} /></div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Forgot password?</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Enter your email to get a reset link</p>
        </div>
        <div className="glass-card p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail size={24} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="font-semibold text-gray-900 dark:text-white mb-1">Check your inbox</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">If an account exists for <strong>{email}</strong>, a reset link was sent.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
        <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-4 transition-colors">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
