import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import { CheckCircle, AlertTriangle, AlertCircle, Info, ChevronRight, SlidersHorizontal, MessageCircle, Crown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ALERT_STYLES = {
  success: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
  danger:  'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300',
  info:    'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
};
const ALERT_ICONS = { success: CheckCircle, warning: AlertTriangle, danger: AlertCircle, info: Info };

function HealthGauge({ score }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#3b82f6' : '#f59e0b';
  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Average' : 'Needs work';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor"
            className="text-gray-100 dark:text-gray-800" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 251.2} 251.2`}
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{score}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">/100</div>
        </div>
      </div>
      <div className="text-sm font-medium mt-1" style={{ color }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { plan, isPro } = usePremium();
  const [scores, setScores] = useState([]);
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches = [api.get('/finance/health-score').catch(() => ({ data: { scores: [] } }))];
    // Only fetch allocation history if pro+
    if (isPro) {
      fetches.push(api.get('/finance/history').catch(() => ({ data: { allocations: [] } })));
    }
    Promise.all(fetches).then(([scoreRes, allocRes]) => {
      setScores(scoreRes.data.scores || []);
      if (allocRes) setAllocation((allocRes.data.allocations || [])[0] || null);
    }).finally(() => setLoading(false));
  }, [isPro]);

  const latestScore = scores[0]?.score || 0;
  const chartData = [...scores].reverse().map((s, i) => ({ day: i + 1, score: s.score }));

  const alerts = [
    !allocation && { type: 'info', message: 'Set up your salary profile in Salary Allocator to get personalised advice' },
    scores[0] && !scores[0].emergency_fund_ok && { type: 'danger', message: 'Emergency fund is below 3 months — build this first' },
    scores[0] && !scores[0].has_insurance && { type: 'warning', message: 'No term insurance detected — protect your family' },
    scores[0] && scores[0].has_investments && { type: 'success', message: 'SIP active — great habit for long-term wealth' },
    { type: 'info', message: 'Ask the AI Advisor any finance question — salary allocation, SIP, tax saving…' },
  ].filter(Boolean);

  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Good day, {firstName} 👋
        </h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Your financial snapshot</p>
      </div>

      {loading ? (
        <div className="text-gray-400 dark:text-gray-500 text-sm animate-pulse">Loading your data…</div>
      ) : (
        <>
          {/* Score + metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="card flex flex-col items-center justify-center py-5">
              <div className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                Financial health
              </div>
              <HealthGauge score={latestScore} />
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              {[
                { label: 'Monthly SIP', value: allocation ? formatINR(allocation.sip_amount) : '—', sub: 'recommended' },
                { label: 'Emergency target', value: allocation ? formatINR(allocation.emergency_fund_amount * 6) : '—', sub: '6-month goal' },
                { label: 'Monthly surplus', value: allocation ? formatINR(allocation.surplus) : '—', sub: 'after expenses' },
                { label: 'Savings rate', value: allocation ? `${Math.round((allocation.surplus / allocation.salary) * 100)}%` : '—', sub: 'of salary' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="card">
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</div>
                  <div className="text-xl font-semibold text-gray-900 dark:text-white">{value}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Plan upgrade nudge for free users */}
          {plan === 'free' && (
            <div className="card border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Crown size={18} className="text-amber-500" />
                  <div>
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">Unlock Pro for ₹99/month</div>
                    <div className="text-xs text-amber-700 dark:text-amber-400">Expense tracking, tax calculator, budgets, bank linking + more</div>
                  </div>
                </div>
                <Link to="/subscription" className="btn-primary text-sm py-2 bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5">
                  <Crown size={13} /> Upgrade
                </Link>
              </div>
            </div>
          )}

          {/* Health trend */}
          {chartData.length > 1 && (
            <div className="card">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Health score trend</div>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={chartData}>
                  <XAxis dataKey="day" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    formatter={(v) => [`${v}/100`, 'Score']}
                    contentStyle={{ background: 'var(--tw-tooltip, #fff)', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Alerts */}
          <div className="card">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Alerts & recommendations</div>
            <div className="space-y-2">
              {alerts.map((a, i) => {
                const Icon = ALERT_ICONS[a.type] || Info;
                return (
                  <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm ${ALERT_STYLES[a.type]}`}>
                    <Icon size={14} className="flex-shrink-0 mt-0.5" />
                    {a.message}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions (only if no allocation set yet) */}
          {!allocation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { to: '/allocator', icon: SlidersHorizontal, label: 'Set up salary profile', sub: 'Get personalised allocation', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
                { to: '/advisor', icon: MessageCircle, label: 'Ask AI Advisor', sub: 'Finance questions answered instantly', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
              ].map(({ to, icon: Icon, label, sub, color }) => (
                <Link key={to} to={to}
                  className="card hover:shadow-md dark:hover:shadow-gray-900 transition-shadow flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                      <Icon size={17} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{sub}</div>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
