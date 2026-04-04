import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import Logo from '../components/Logo';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api.post('/email/verify/confirm', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  const configs = {
    verifying: { icon: <Loader size={28} className="text-blue-500 animate-spin" />,   bg: 'bg-blue-50 dark:bg-blue-900/30',    title: 'Verifying…',     sub: 'Please wait a moment.' },
    success:   { icon: <CheckCircle size={28} className="text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-900/30', title: 'Email verified!', sub: 'Your account is now fully active.' },
    error:     { icon: <XCircle size={28} className="text-red-500" />,         bg: 'bg-red-50 dark:bg-red-900/30',         title: 'Link expired',   sub: 'This link may have expired. Request a new one.' },
  };
  const cfg = configs[status];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center relative z-10">
        <div className="flex justify-center mb-6"><Logo size={48} /></div>
        <div className="glass-card p-8">
          <div className={`w-16 h-16 ${cfg.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>{cfg.icon}</div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{cfg.title}</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">{cfg.sub}</p>
          {status !== 'verifying' && (
            <Link to={status === 'success' ? '/' : '/forgot-password'}
              className="btn-primary inline-flex items-center gap-2">
              {status === 'success' ? 'Go to dashboard →' : 'Request new link →'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
