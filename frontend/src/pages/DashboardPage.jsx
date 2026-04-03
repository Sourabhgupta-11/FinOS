import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { formatINR } from '../utils/api';
import { TrendingUp, Shield, AlertTriangle, CheckCircle, ChevronRight, SlidersHorizontal, MessageCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function HealthGauge({ score }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#3b82f6' : '#f59e0b';
  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Average' : 'Needs attention';
  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${(score / 100) * 251.2} 251.2`}
            strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute text-center">
          <div className="text-3xl font-bold text-gray-900">{score}</div>
          <div className="text-xs text-gray-400">/100</div>
        </div>
      </div>
      <div className="mt-2 text-sm font-medium" style={{ color }}>{label}</div>
    </div>
  );
}

function AlertItem({ type, message }) {
  const cfg = {
    success: { bg: 'bg-green-50', text: 'text-green-800', icon: <CheckCircle size={15} className="text-green-500 flex-shrink-0" /> },
    warning: { bg: 'bg-yellow-50', text: 'text-yellow-800', icon: <AlertTriangle size={15} className="text-yellow-500 flex-shrink-0" /> },
    danger:  { bg: 'bg-red-50',    text: 'text-red-800',    icon: <AlertTriangle size={15} className="text-red-500 flex-shrink-0" /> },
    info:    { bg: 'bg-blue-50',   text: 'text-blue-800',   icon: <Shield size={15} className="text-blue-500 flex-shrink-0" /> },
  }[type] || { bg: 'bg-gray-50', text: 'text-gray-700', icon: null };

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm ${cfg.bg} ${cfg.text}`}>
      {cfg.icon}
      <span>{message}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [scores, setScores] = useState([]);
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [scoreRes, allocRes] = await Promise.all([
          api.get('/finance/health-score'),
          api.get('/finance/history'),
        ]);
        setScores(scoreRes.data.scores);
        if (allocRes.data.allocations.length > 0) {
          setAllocation(allocRes.data.allocations[0]);
        }
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const latestScore = scores[0]?.score || 0;
  const chartData = [...scores].reverse().map((s, i) => ({
    day: i + 1,
    score: s.score,
  }));

  const alerts = [
    !allocation && { type: 'warning', message: 'Complete your salary profile to get personalised advice' },
    scores[0] && !scores[0].emergency_fund_ok && { type: 'danger', message: 'Emergency fund is below 3 months — top priority' },
    scores[0] && !scores[0].has_insurance && { type: 'warning', message: 'No term insurance detected — protect your family' },
    scores[0] && scores[0].has_investments && { type: 'success', message: 'SIP investments active — great wealth-building habit' },
    { type: 'info', message: 'Ask the AI Advisor anything about taxes, SIP, or insurance' },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Good day, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-400 text-sm mt-0.5">Here's your financial snapshot</p>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading your data...</div>
      ) : (
        <>
          {/* Score + metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="card flex flex-col items-center justify-center py-6">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Financial health</div>
              <HealthGauge score={latestScore} />
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              {[
                { label: 'Monthly SIP', value: allocation ? formatINR(allocation.sip_amount) : '—', sub: 'recommended' },
                { label: 'Emergency target', value: allocation ? formatINR(allocation.emergency_fund_amount * 6) : '—', sub: '6 months' },
                { label: 'Monthly surplus', value: allocation ? formatINR(allocation.surplus) : '—', sub: 'after expenses' },
                { label: 'Savings rate', value: allocation ? `${Math.round((allocation.surplus / allocation.salary) * 100)}%` : '—', sub: 'of salary' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="card">
                  <div className="text-xs text-gray-400 mb-1">{label}</div>
                  <div className="text-2xl font-semibold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="card">
              <div className="text-sm font-medium text-gray-700 mb-4">Health score trend</div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData}>
                  <XAxis dataKey="day" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip formatter={(v) => [`${v}/100`, 'Score']} />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Alerts */}
          <div className="card">
            <div className="text-sm font-medium text-gray-700 mb-3">Alerts & recommendations</div>
            <div className="space-y-2">
              {alerts.map((a, i) => <AlertItem key={i} {...a} />)}
            </div>
          </div>

          {/* Quick actions */}
          {!allocation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/allocator" className="card hover:shadow-md transition-shadow flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <SlidersHorizontal size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Set up salary profile</div>
                    <div className="text-xs text-gray-400">Get personalised allocation</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </Link>
              <Link to="/advisor" className="card hover:shadow-md transition-shadow flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <MessageCircle size={18} className="text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Ask AI Advisor</div>
                    <div className="text-xs text-gray-400">Finance questions answered</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
