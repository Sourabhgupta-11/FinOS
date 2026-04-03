import { useEffect, useState } from 'react';
import api, { formatINR } from '../utils/api';
import { usePremium } from '../hooks/usePremium';
import PremiumGate from '../components/PremiumGate';
import { History, TrendingUp } from 'lucide-react';

export default function HistoryPage() {
  const { isPro, loading: premLoading } = usePremium();
  const [allocations, setAllocations] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!premLoading && isPro) {
      Promise.all([
        api.get('/finance/history'),
        api.get('/finance/health-score'),
      ]).then(([a, s]) => {
        setAllocations(a.data.allocations || []);
        setScores(s.data.scores || []);
      }).catch(() => {}).finally(() => setLoading(false));
    } else if (!premLoading) {
      setLoading(false);
    }
  }, [premLoading, isPro]);

  if (premLoading) return <div className="text-gray-400 text-sm animate-pulse">Loading…</div>;
  if (!isPro) return <PremiumGate requiredPlan="pro" feature="Allocation History" />;
  if (loading) return <div className="text-gray-400 text-sm animate-pulse">Loading history…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">History</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Your past allocations and health score trend</p>
      </div>

      {allocations.length === 0 ? (
        <div className="card text-center py-12">
          <History size={36} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <div className="text-gray-500 dark:text-gray-400 text-sm">No allocation history yet</div>
          <div className="text-gray-400 dark:text-gray-600 text-xs mt-1">Use the Salary Allocator to get started</div>
        </div>
      ) : (
        <div className="card">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp size={15} /> Allocation history
          </div>
          <div className="space-y-3">
            {allocations.map((a) => (
              <div key={a.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Salary: {formatINR(a.salary)}/month
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(a.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </div>
                  </div>
                  {a.health_score && (
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{a.health_score}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">health score</div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { label: 'SIP', value: formatINR(a.sip_amount), color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Emergency', value: formatINR(a.emergency_fund_amount), color: 'text-green-600 dark:text-green-400' },
                    { label: 'Stocks', value: formatINR(a.stocks_amount), color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Savings', value: formatINR(a.savings_amount), color: 'text-purple-600 dark:text-purple-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                      <div className={`font-semibold ${color}`}>{value}</div>
                      <div className="text-gray-400 dark:text-gray-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scores.length > 0 && (
        <div className="card">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Health score trend</div>
          <div className="space-y-2">
            {scores.slice(0, 10).map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="text-xs text-gray-400 dark:text-gray-500 w-24 flex-shrink-0">
                  {new Date(s.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                </div>
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{
                      width: `${s.score}%`,
                      background: s.score >= 75 ? '#10b981' : s.score >= 50 ? '#3b82f6' : '#f59e0b',
                    }} />
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 w-14 text-right">
                  {s.score}/100
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
