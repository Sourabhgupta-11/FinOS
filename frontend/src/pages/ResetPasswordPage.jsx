import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import Logo from "../components/Logo";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Lock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);
  const [tokenValid, setTokenValid] = useState(true); // Assume valid initially
  const [done, setDone] = useState(false);

  // Validate token format and length
  const isTokenValid =
    token &&
    typeof token === "string" &&
    token.length > 20 &&
    token.length < 500;

  async function handleSubmit(e) {
    e.preventDefault();

    // Client-side validation
    if (!pw || !confirm) {
      setError("Both password fields are required");
      return;
    }

    if (pw.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (pw !== confirm) {
      setError("Passwords do not match");
      return;
    }

    // Check for weak password (only spaces)
    if (pw.trim().length < 8) {
      setError("Password cannot be just spaces");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/email/reset-password", {
        token,
        password: pw,
      });

      // Log success for debugging
      console.log("Password reset response:", response.data);

      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      const errorMsg = err.response?.data?.error;

      // Log error for debugging
      console.error("Password reset error:", {
        status: err.response?.status,
        error: err.response?.data,
        message: err.message,
      });

      if (
        err.response?.status === 400 &&
        errorMsg &&
        errorMsg.includes("expired")
      ) {
        setError(errorMsg);
        setTokenValid(false);
      } else {
        setError(
          errorMsg ||
            "Password reset failed. Please check your link and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // If no token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <Logo size={48} />
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              />
              <div className="text-left">
                <h3 className="font-semibold text-red-900 dark:text-red-300 text-sm">
                  Invalid Reset Link
                </h3>
                <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                  The password reset link is missing.
                </p>
              </div>
            </div>
          </div>
          <Link
            to="/forgot-password"
            className="text-blue-600 dark:text-blue-400 text-sm hover:underline mt-4 inline-block"
          >
            Request a new reset link →
          </Link>
        </div>
      </div>
    );
  }

  // If token format is invalid
  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <Logo size={48} />
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              />
              <div className="text-left">
                <h3 className="font-semibold text-red-900 dark:text-red-300 text-sm">
                  Invalid Reset Link
                </h3>
                <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                  The reset link is malformed or corrupted.
                </p>
              </div>
            </div>
          </div>
          <Link
            to="/forgot-password"
            className="text-blue-600 dark:text-blue-400 text-sm hover:underline mt-4 inline-block"
          >
            Request a new reset link →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={48} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Set new password
          </h1>
        </div>
        <div className="card p-6">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle
                  size={24}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                Password reset!
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                You can now sign in with your new password.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle
                    size={16}
                    className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                  />
                  <div className="text-red-700 dark:text-red-300 text-sm">
                    {error}
                  </div>
                </div>
              )}

              <div>
                <label className="label">New password</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPw ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    disabled={loading}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirm new password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading || !pw || !confirm}
              >
                {loading ? "Resetting password…" : "Reset password"}
              </button>
            </form>
          )}
        </div>

        {!done && (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-4 transition-colors"
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
