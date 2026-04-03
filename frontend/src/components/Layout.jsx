import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  LayoutDashboard, SlidersHorizontal, MessageCircle, FlaskConical,
  History, LogOut, IndianRupee, Menu, TrendingUp, Calculator,
  CreditCard, PiggyBank, Target, Bell, Crown, Landmark
} from 'lucide-react';

const NAV = [
  { to: '/',           icon: LayoutDashboard,   label: 'Dashboard',    free: true },
  { to: '/allocator',  icon: SlidersHorizontal, label: 'Salary Allocator', free: true },
  { to: '/advisor',    icon: MessageCircle,     label: 'AI Advisor',   free: true },
  { to: '/simulator',  icon: FlaskConical,      label: 'Simulator',    free: true },
  { label: '── Premium ──', divider: true },
  { to: '/bank',       icon: Landmark,          label: 'Bank Accounts', free: false },
  { to: '/expenses',   icon: CreditCard,        label: 'Expenses',     free: false },
  { to: '/budgets',    icon: Target,            label: 'Budgets',      free: false },
  { to: '/portfolio',  icon: TrendingUp,        label: 'Portfolio',    free: false },
  { to: '/tax',        icon: Calculator,        label: 'Tax Calculator', free: false },
  { label: '── Account ──', divider: true },
  { to: '/history',    icon: History,           label: 'History',      free: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    api.get('/notifications').then(r => setUnread(r.data.unread || 0)).catch(() => {});
    api.get('/subscription').then(r => setIsPremium(r.data.plan === 'premium')).catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 w-64 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
          <IndianRupee size={18} className="text-white" />
        </div>
        <div>
          <div className="font-semibold text-gray-900 text-sm leading-tight">Financial OS</div>
          <div className="text-xs text-gray-400">AI Finance Advisor</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item, i) => {
          if (item.divider) return (
            <div key={i} className="px-3 pt-3 pb-1 text-xs font-medium text-gray-300 tracking-wide">{item.label}</div>
          );
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group
                 ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
              }
            >
              <item.icon size={16} />
              <span className="flex-1">{item.label}</span>
              {!item.free && !isPremium && (
                <Crown size={12} className="text-amber-400" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-1">
        {!isPremium && (
          <NavLink to="/subscription" onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors">
            <Crown size={15} />
            Upgrade to Premium
          </NavLink>
        )}
        <NavLink to="/notifications" onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
             ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`
          }>
          <Bell size={16} />
          <span className="flex-1">Notifications</span>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </NavLink>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">{user?.name}</div>
            <div className="text-xs text-gray-400 truncate">{isPremium ? '⭐ Premium' : 'Free plan'}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative z-10 h-full flex"><SidebarContent /></div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <IndianRupee size={16} className="text-blue-600" />
            <span className="font-semibold text-sm">Financial OS</span>
          </div>
          <NavLink to="/notifications" className="relative p-1.5">
            <Bell size={18} className="text-gray-600" />
            {unread > 0 && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />}
          </NavLink>
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
