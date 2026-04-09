import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import { FullScreenLoader } from "./components/Loader";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import GoogleCallbackPage from "./pages/GoogleCallbackPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsConditionsPage from "./pages/TermsConditionsPage";
import RefundPolicyPage from "./pages/RefundPolicyPage";
import ContactUsPage from "./pages/ContactUsPage";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import BasicAllocatorPage from "./pages/BasicAllocatorPage";
import AdvancedAllocatorPage from "./pages/AdvancedAllocatorPage";
import AdvisorPage from "./pages/AdvisorPage";
import SimulatorPage from "./pages/SimulatorPage";
import HistoryPage from "./pages/HistoryPage";
import PortfolioPage from "./pages/PortfolioPage";
import TaxCalculatorPage from "./pages/TaxCalculatorPage";
import ExpensesPage from "./pages/ExpensesPage";
import BankAccountsPage from "./pages/BankAccountsPage";
import BudgetsPage from "./pages/BudgetsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader label="Loading FinOS…" />;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/home" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<GoogleCallbackPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsConditionsPage />} />
      <Route path="/refund" element={<RefundPolicyPage />} />
      <Route path="/contact" element={<ContactUsPage />} />

      {/* Protected app */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="allocator" element={<BasicAllocatorPage />} />
        <Route path="allocator-advanced" element={<AdvancedAllocatorPage />} />
        <Route path="advisor" element={<AdvisorPage />} />
        <Route path="simulator" element={<SimulatorPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="tax" element={<TaxCalculatorPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="bank" element={<BankAccountsPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}