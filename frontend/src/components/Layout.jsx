import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../hooks/usePremium';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  LayoutDashboard, SlidersHorizontal, MessageCircle, FlaskConical,
  History, LogOut, Menu, TrendingUp, Calculator,
  CreditCard, Target, Bell, Crown, Landmark, Sun, Moon, IndianRupee
} from 'lucide-react';

const NAV_ITEMS = [
  // Free
  { to: '/',          icon: LayoutDashboard,   label: 'Dashboard',        minPlan: 'free' },
  { to: '/allocator', icon: SlidersHorizontal, label: 'Salary Allocator', minPlan: 'free' },
  { to: '/advisor',   icon: MessageCircle,     label: 'AI Advisor',       minPlan: 'free' },
  { divider: 'Pro' },
  { to: '/simulator', icon: FlaskConical,      label: 'Simulator',        minPlan: 'pro' },
  { to: '/expenses',  icon: CreditCard,        label: 'Expenses',         minPlan: 'pro' },
  { to: '/bank',      icon: Landmark,          label: 'Bank Accounts',    minPlan: 'pro' },
  { to: '/budgets',   icon: Target,            label: 'Budgets',          minPlan: 'pro' },
  { to: '/tax',       icon: Calculator,        label: 'Tax Calculator',   minPlan: 'pro' },
  { divider: 'Premium' },
  { to: '/portfolio', icon: TrendingUp,        label: 'Portfolio',        minPlan: 'premium' },
  { divider: 'Account' },
  { to: '/history',   icon: History,           label: 'History',          minPlan: 'pro' },
];

function NavItem({ item, plan, onClose }) {
  const locked = !['free','pro','premium'].slice(0, ['free','pro','premium'].indexOf(plan) + 1).includes(item.minPlan);
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group
         ${isActive
           ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
           : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'}`
      }
    >
      <item.icon size={16} />
      <span className="flex-1">{item.label}</span>
      {locked && <Crown size={11} className="text-amber-400 opacity-70" />}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { toggle, isDark } = useTheme();
  const { plan, isPro, isPremium } = usePremium();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (isPro) {
      api.get('/notifications').then(r => setUnread(r.data.unread || 0)).catch(() => {});
    }
  }, [isPro]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const planLabel = isPremium ? '⭐ Premium' : isPro ? '🔵 Pro' : 'Free';
  const planColor = isPremium ? 'text-amber-500' : isPro ? 'text-blue-500' : 'text-gray-400';

  const Sidebar = () => (
    <div className="flex flex-col h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-shrink-0">
      {/* Logo — FinOS, no subtitle */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <IndianRupee size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-base tracking-tight">FinOS</span>
        </div>
        <button onClick={toggle}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item, i) => {
          if (item.divider) return (
            <div key={i} className="px-3 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-300 dark:text-gray-600 font-medium">{item.divider}</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          );
          const PLAN_ORDER = { free: 0, pro: 1, premium: 2 };
          const locked = PLAN_ORDER[plan] < PLAN_ORDER[item.minPlan];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                 ${isActive
                   ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                   : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'}`
              }
            >
              <item.icon size={16} />
              <span className="flex-1">{item.label}</span>
              {locked && <Crown size={11} className="text-amber-400 opacity-60" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
        {!isPremium && (
          <NavLink to="/subscription" onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                 : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'}`
            }>
            <Crown size={14} />
            {isPro ? 'Upgrade to Premium' : 'Upgrade Plan'}
          </NavLink>
        )}

        {isPro && (
          <NavLink to="/notifications" onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
               ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`
            }>
            <Bell size={15} />
            <span className="flex-1">Notifications</span>
            {unread > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </NavLink>
        )}

        {/* User row */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-900 dark:text-gray-200 truncate">{user?.name}</div>
            <div className={`text-xs truncate ${planColor}`}>{planLabel}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors">
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 h-full flex"><Sidebar /></div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <Menu size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <IndianRupee size={13} className="text-white" />
            </div>
            <span className="font-bold text-sm dark:text-white">FinOS</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              {isDark ? <Sun size={16} className="text-gray-400" /> : <Moon size={16} className="text-gray-400" />}
            </button>
            {isPro && (
              <NavLink to="/notifications" className="relative p-1.5">
                <Bell size={18} className="text-gray-600 dark:text-gray-400" />
                {unread > 0 && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />}
              </NavLink>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
