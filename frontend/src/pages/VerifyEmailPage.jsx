import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { IndianRupee } from 'lucide-react';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api.post('/email/verify/confirm', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  const config = {
    verifying: { emoji: '⏳', title: 'Verifying your email…', sub: 'Please wait a moment.' },
    success:   { emoji: '✅', title: 'Email verified!', sub: 'Your account is now fully active.' },
    error:     { emoji: '❌', title: 'Verification failed', sub: 'The link may have expired or already been used.' },
  }[status];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <IndianRupee size={28} className="text-white" />
        </div>
        <div className="card py-10">
          <div className="text-5xl mb-4">{config.emoji}</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{config.title}</h1>
          <p className="text-gray-400 text-sm mb-6">{config.sub}</p>
          {status !== 'verifying' && (
            <Link to="/" className="btn-primary inline-block">
              {status === 'success' ? 'Go to dashboard' : 'Back to home'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
