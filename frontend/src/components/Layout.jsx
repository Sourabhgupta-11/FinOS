import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { usePremium } from "../hooks/usePremium";
import { useState, useEffect } from "react";
import api from "../utils/api";
import Logo from "./Logo";
import {
  LayoutDashboard,
  SlidersHorizontal,
  MessageCircle,
  FlaskConical,
  History,
  LogOut,
  Menu,
  TrendingUp,
  Calculator,
  CreditCard,
  Target,
  Bell,
  Crown,
  Landmark,
  Sun,
  Moon,
  User,
  Zap,
  X,
} from "lucide-react";

const PLAN_ORDER = { free: 0, pro: 1, premium: 2 };

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", min: "free" },
  {
    to: "/allocator",
    icon: SlidersHorizontal,
    label: "Allocator",
    min: "free",
  },
  { to: "/advisor", icon: MessageCircle, label: "AI Advisor", min: "free" },
  { section: "Pro" },
  { to: "/simulator", icon: FlaskConical, label: "Simulator", min: "pro" },
  { to: "/history", icon: History, label: "History", min: "pro" },
  { to: "/expenses", icon: CreditCard, label: "Expenses", min: "pro" },
  { to: "/budgets", icon: Target, label: "Budgets", min: "pro" },
  { section: "Premium" },
  { to: "/bank", icon: Landmark, label: "Bank Accounts", min: "premium" },
  { to: "/tax", icon: Calculator, label: "Tax Calculator", min: "premium" },
  { to: "/portfolio", icon: TrendingUp, label: "Portfolio", min: "premium" },
];

function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="btn-ghost relative overflow-hidden w-8 h-8 flex items-center justify-center"
      title="Toggle theme"
    >
      <span
        className={`absolute transition-all duration-300 ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"}`}
      >
        <Sun size={15} className="text-amber-400" />
      </span>
      <span
        className={`absolute transition-all duration-300 ${!isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`}
      >
        <Moon size={15} className="text-slate-400" />
      </span>
    </button>
  );
}

function NavItem({ item, currentPlan, onClose }) {
  const locked = PLAN_ORDER[currentPlan] < PLAN_ORDER[item.min];
  const LockIcon = item.min === "premium" ? Crown : Zap;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onClose}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative
         ${
           isActive
             ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
             : locked
               ? "text-gray-300 dark:text-gray-600 cursor-default"
               : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
         }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon size={16} className={isActive ? "text-white" : ""} />
          <span className="flex-1">{item.label}</span>
          {/* Always show lock icon for features above current plan */}
          {locked && <LockIcon size={11} className="opacity-40" />}
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { toggle } = useTheme();
  const { plan } = usePremium();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (PLAN_ORDER[plan] >= PLAN_ORDER.pro) {
      api
        .get("/notifications")
        .then((r) => setUnread(r.data.unread || 0))
        .catch(() => {});
    }
  }, [plan]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const planBadge =
    plan === "premium"
      ? { label: "Premium", cls: "text-amber-500 dark:text-amber-400" }
      : plan === "pro"
        ? { label: "Pro", cls: "text-blue-500 dark:text-blue-400" }
        : { label: "Free", cls: "text-gray-400" };

  const SidebarInner = () => (
    <div className="flex flex-col h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <div>
            <div className="font-extrabold text-gray-900 dark:text-white text-lg tracking-tight leading-none">
              FinOS
            </div>
            <div
              className={`text-xs font-semibold ${planBadge.cls} leading-none mt-0.5`}
            >
              {planBadge.label}
            </div>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {NAV.map((item, i) => {
          if (item.section) {
            return (
              <div key={i} className="px-3 pt-4 pb-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                  <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest">
                    {item.section}
                  </span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            );
          }
          return (
            <NavItem
              key={item.to}
              item={item}
              currentPlan={plan}
              onClose={() => setOpen(false)}
            />
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
        {plan !== "premium" && (
          <NavLink
            to="/subscription"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
               ${
                 isActive
                   ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                   : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-700 dark:text-amber-400 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30"
               }`
            }
          >
            <Crown size={14} />
            {plan === "pro" ? "Upgrade to Premium" : "Upgrade Plan"}
          </NavLink>
        )}

        {PLAN_ORDER[plan] >= PLAN_ORDER.pro && (
          <NavLink
            to="/notifications"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
               ${isActive ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`
            }
          >
            {({ isActive }) => (
              <>
                <Bell size={15} className={isActive ? "text-white" : ""} />
                <span className="flex-1">Notifications</span>
                {unread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </>
            )}
          </NavLink>
        )}

        {/* Profile */}
        <NavLink
          to="/profile"
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all
             ${isActive ? "bg-gray-100 dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-800/60"}`
          }
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.name}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {user?.email}
            </div>
          </div>
          <User
            size={13}
            className="text-gray-300 dark:text-gray-600 flex-shrink-0"
          />
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="hidden lg:flex h-full">
        <SidebarInner />
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 h-full flex animate-[slideIn_0.2s_ease-out]">
            <SidebarInner />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => setOpen(true)} className="btn-ghost">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-extrabold text-gray-900 dark:text-white">
              FinOS
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {PLAN_ORDER[plan] >= PLAN_ORDER.pro && (
              <NavLink to="/notifications" className="relative btn-ghost">
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </NavLink>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
