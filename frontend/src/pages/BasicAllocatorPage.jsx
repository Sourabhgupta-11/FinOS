import { useState } from "react";
import api, { formatINR } from "../utils/api";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const ALERT_STYLES = {
  success:
    "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/40",
  warning:
    "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-800/40",
  danger:
    "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-800/40",
  info: "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40",
};
const ALERT_ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
};
const ALLOC_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

export default function BasicAllocatorPage() {
  const [form, setForm] = useState({
    salary: "",
    age: "",
    riskLevel: "medium",
    monthlyExpenses: "",
    hasInsurance: false,
    emergencyFundMonths: 0,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/finance/allocate", {
        ...form,
        salary: parseFloat(form.salary),
        age: parseInt(form.age),
        monthlyExpenses: form.monthlyExpenses
          ? parseFloat(form.monthlyExpenses)
          : undefined,
        emergencyFundMonths: parseInt(form.emergencyFundMonths),
        goal: "wealth", // default goal for basic allocator
      });
      setResult(res.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Calculation failed. Please check your inputs.",
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
  };

  const allocItems = result
    ? [
        {
          label: "SIP / Mutual funds",
          amount: result.allocation.sip,
          pct: result.allocation.percentages.sip,
          color: ALLOC_COLORS[0],
        },
        {
          label: "Emergency fund",
          amount: result.allocation.emergencyFund,
          pct: result.allocation.percentages.emergencyFund,
          color: ALLOC_COLORS[1],
        },
        {
          label: "Direct stocks",
          amount: result.allocation.stocks,
          pct: result.allocation.percentages.stocks,
          color: ALLOC_COLORS[2],
        },
        {
          label: "Short-term savings",
          amount: result.allocation.savings,
          pct: result.allocation.percentages.savings,
          color: ALLOC_COLORS[3],
        },
      ]
    : [];

  const chartData = allocItems.map((i) => ({
    name: i.label.split("/")[0].trim(),
    amount: i.amount,
    color: i.color,
  }));
  const scoreColor = result
    ? result.healthScore >= 75
      ? "#10b981"
      : result.healthScore >= 50
        ? "#3b82f6"
        : "#f59e0b"
    : "#3b82f6";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Basic Allocator
        </h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
          Get a simple breakdown of your money based on your profile
        </p>
      </div>

      {/* ── RESULTS ───────────────────────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-4 page-enter">
          {/* Score summary */}
          <div className="card flex items-center gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}cc)`,
              }}
            >
              {result.healthScore}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-white">
                Health score: {result.healthScore}/100
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                Based on your financial profile
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden w-48">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${result.healthScore}%`,
                    background: scoreColor,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="card">
            <div className="section-title">
              Monthly allocation — surplus{" "}
              {formatINR(result.allocation.surplus)}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={40} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(v) => [formatINR(v), "Amount"]}
                  contentStyle={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown rows */}
          <div className="card">
            <div className="section-title">Breakdown</div>
            <div className="space-y-3">
              {allocItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: item.color }}
                  />
                  <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {item.label}
                  </div>
                  <div className="w-28 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.pct}%`, background: item.color }}
                    />
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white w-24 text-right tabular-nums">
                    {formatINR(item.amount)}
                  </div>
                  <div className="text-xs text-gray-400 w-8 text-right">
                    {item.pct}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="card">
            <div className="section-title">Recommendations</div>
            <div className="space-y-2">
              {result.alerts.map((a, i) => {
                const Icon = ALERT_ICONS[a.type] || Info;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm ${ALERT_STYLES[a.type]}`}
                  >
                    <Icon size={14} className="flex-shrink-0 mt-0.5" />{" "}
                    {a.message}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roadmap */}
          <div className="card">
            <div className="section-title flex items-center gap-2">
              <Calendar size={13} /> Your 6-month roadmap
            </div>
            <div className="space-y-0">
              {result.roadmap.map((step, i) => (
                <div key={i} className="flex gap-4 pb-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      {step.month}
                    </div>
                    {i < result.roadmap.length - 1 && (
                      <div
                        className="w-0.5 bg-blue-100 dark:bg-blue-900/40 flex-1 mt-1"
                        style={{ minHeight: 20 }}
                      />
                    )}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 pt-1.5 pb-2 leading-relaxed">
                    {step.action}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={reset} className="btn-secondary w-full text-sm">
            Calculate with different inputs
          </button>
        </div>
      )}

      {/* ── FORM ─────────────────────────────────────── */}
      {!result && (
        <div className="card page-enter">
          <div className="section-title">Tell us about yourself</div>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-xl mb-4 border border-red-100 dark:border-red-800/40">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Monthly salary (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  type="number"
                  placeholder="80000"
                  value={form.salary}
                  onChange={(e) => set("salary", e.target.value)}
                  required
                  min="10000"
                />
              </div>
              <div>
                <label className="label">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  type="number"
                  placeholder="26"
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                  required
                  min="18"
                  max="80"
                />
              </div>
              <div>
                <label className="label">Risk level</label>
                <select
                  className="input"
                  value={form.riskLevel}
                  onChange={(e) => set("riskLevel", e.target.value)}
                >
                  <option value="low">Low — safety first</option>
                  <option value="medium">Medium — balanced</option>
                  <option value="high">High — growth focused</option>
                </select>
              </div>
              <div>
                <label className="label">Monthly expenses (₹)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="Auto-calculated"
                  value={form.monthlyExpenses}
                  onChange={(e) => set("monthlyExpenses", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Emergency fund (months saved)</label>
                <select
                  className="input"
                  value={form.emergencyFundMonths}
                  onChange={(e) => set("emergencyFundMonths", e.target.value)}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 9, 12].map((m) => (
                    <option key={m} value={m}>
                      {m === 0
                        ? "0 — none yet"
                        : `${m} months${m >= 6 ? " ✓ healthy" : ""}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="insurance"
                checked={form.hasInsurance}
                onChange={(e) => set("hasInsurance", e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <label
                htmlFor="insurance"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                I have term life insurance
              </label>
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? "Calculating…" : "Get my allocation →"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
