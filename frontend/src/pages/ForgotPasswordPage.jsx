import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { IndianRupee, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/email/forgot-password', { email });
      setSent(true);
    } catch { setSent(true); /* always show success to prevent enumeration */ }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <IndianRupee size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your email and we'll send a reset link</p>
        </div>
        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-green-600 text-4xl mb-3">✓</div>
              <div className="font-medium text-gray-900 mb-1">Check your email</div>
              <div className="text-sm text-gray-500">If an account exists for {email}, you'll receive a reset link shortly.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
        <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 mt-4 transition-colors">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
