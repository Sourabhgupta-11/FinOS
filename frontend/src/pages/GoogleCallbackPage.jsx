// frontend/src/pages/GoogleCallbackPage.jsx
// This page receives the JWT token from the Google OAuth redirect
// Add this route to App.jsx: <Route path="/auth/callback" element={<GoogleCallbackPage />} />

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      localStorage.setItem('token', token);
      // Reload page so AuthContext picks up the new token
      window.location.href = '/';
    } else {
      navigate('/login?error=' + (error || 'google_failed'));
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-gray-400 text-sm">Signing you in with Google…</div>
      </div>
    </div>
  );
}
