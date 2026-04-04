import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Logo from '../components/Logo';
import { Eye, EyeOff, ArrowLeft, Lock } from 'lucide-react';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (pw !== confirm) { setError('Passwords do not match'); return; }
    if (pw.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/email/reset-password', { token, password: pw });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Link expired. Request a new one.');
    } finally { setLoading(false); }
  }

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center dark:bg-gray-950">
      <div className="text-center">
        <div className="text-red-500 mb-2 font-medium">Invalid reset link</div>
        <Link to="/forgot-password" className="text-blue-600 dark:text-blue-400 text-sm hover:underline">Request a new one →</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><Logo size={48} /></div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Set new password</h1>
        </div>
        <div className="glass-card p-6">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="font-semibold text-gray-900 dark:text-white mb-1">Password reset!</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Redirecting to sign in…</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-xl">{error}</div>}
              <div>
                <label className="label">New password</label>
                <div className="relative">
                  <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder="Min 8 characters"
                    value={pw} onChange={e => setPw(e.target.value)} required minLength={8} autoFocus />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input className="input" type="password" placeholder="Repeat password"
                  value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          )}
        </div>
        {!done && (
          <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-4 transition-colors">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
