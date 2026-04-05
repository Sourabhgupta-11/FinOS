import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import AllocatorPage from './pages/AllocatorPage';
import AdvisorPage from './pages/AdvisorPage';
import SimulatorPage from './pages/SimulatorPage';
import HistoryPage from './pages/HistoryPage';
import PortfolioPage from './pages/PortfolioPage';
import TaxCalculatorPage from './pages/TaxCalculatorPage';
import ExpensesPage from './pages/ExpensesPage';
import BankAccountsPage from './pages/BankAccountsPage';
import BudgetsPage from './pages/BudgetsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-gray-400 dark:text-gray-600 text-sm">Loading FinOS…</div>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth/callback"   element={<GoogleCallbackPage />} />
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/register"        element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />
      <Route path="/verify-email"    element={<VerifyEmailPage />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index                element={<DashboardPage />} />
        <Route path="allocator"     element={<AllocatorPage />} />
        <Route path="advisor"       element={<AdvisorPage />} />
        <Route path="simulator"     element={<SimulatorPage />} />
        <Route path="portfolio"     element={<PortfolioPage />} />
        <Route path="tax"           element={<TaxCalculatorPage />} />
        <Route path="expenses"      element={<ExpensesPage />} />
        <Route path="bank"          element={<BankAccountsPage />} />
        <Route path="budgets"       element={<BudgetsPage />} />
        <Route path="history"       element={<HistoryPage />} />
        <Route path="subscription"  element={<SubscriptionPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile"       element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}