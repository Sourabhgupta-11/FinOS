import { useState, useEffect } from "react";
import api, { formatINR } from "../utils/api";
import { usePremium } from "../hooks/usePremium";
import PremiumGate from "../components/PremiumGate";
import { Plus, Target, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";

export default function BudgetsPage() {
  const { isPremium: isPro, loading: premLoading } = usePremium();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    amount: "",
    period: "monthly",
    alertAtPct: 80,
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!premLoading && isPro) load();
    else if (!premLoading) setLoading(false);
  }, [premLoading, isPro]);

  async function load() {
    try {
      const [bRes, cRes] = await Promise.all([
        api.get("/bank/budgets"),
        api.get("/bank/categories"),
      ]);
      setBudgets(bRes.data.budgets || []);
      setCategories(
        (cRes.data.categories || []).filter((c) => c.type === "expense"),
      );
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name || !form.amount) {
      alert("Please fill all required fields");
      return;
    }
    try {
      await api.post("/bank/budgets", {
        ...form,
        categoryId: form.categoryId || null,
      });
      setShowAdd(false);
      setForm({
        name: "",
        categoryId: "",
        amount: "",
        period: "monthly",
        alertAtPct: 80,
      });
      load();
    } catch (err) {
      alert(
        "Failed to create budget: " +
          (err.response?.data?.error || err.message),
      );
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this budget?")) return;
    await api.delete(`/bank/budgets/${id}`).catch(() => {});
    load();
  }

  if (premLoading)
    return <div className="text-gray-400 animate-pulse text-sm">Loading…</div>;
  if (!isPro)
    return <PremiumGate requiredPlan="premium" feature="Budget Manager" />;

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + parseFloat(b.spent || 0), 0);
  const overBudget = budgets.filter((b) => b.pct >= 100).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Budgets
          </h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
            Set monthly spending limits and get alerts
          </p>
        </div>
        <button
          onClick={() => setShowAdd((p) => !p)}
          className="btn-primary text-sm py-2 flex items-center gap-2"
        >
          <Plus size={14} /> Add budget
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total budgeted",
            value: formatINR(totalBudget),
            color: "text-gray-900 dark:text-white",
          },
          {
            label: "Total spent",
            value: formatINR(totalSpent),
            color:
              totalSpent > totalBudget
                ? "text-red-600 dark:text-red-400"
                : "text-gray-900 dark:text-white",
          },
          {
            label: "Over budget",
            value: `${overBudget} item${overBudget !== 1 ? "s" : ""}`,
            color:
              overBudget > 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className={`text-xl font-bold tabular-nums ${color}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card">
          <div className="section-title">New budget</div>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Budget name</label>
                <input
                  className="input"
                  placeholder="Dining out"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                >
                  <option value="">All expenses</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Monthly limit (₹)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="3000"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Alert threshold</label>
                <select
                  className="input"
                  value={form.alertAtPct}
                  onChange={(e) => set("alertAtPct", parseInt(e.target.value))}
                >
                  {[50, 60, 70, 75, 80, 90, 100].map((p) => (
                    <option key={p} value={p}>
                      {p}% used
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm py-2">
                Create budget
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="btn-secondary text-sm py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 dark:text-gray-600 animate-pulse text-sm">
          Loading budgets…
        </div>
      ) : budgets.length === 0 ? (
        <div className="card text-center py-14">
          <Target
            size={36}
            className="text-gray-200 dark:text-gray-700 mx-auto mb-3"
          />
          <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            No budgets yet
          </div>
          <div className="text-gray-400 dark:text-gray-600 text-xs mt-1">
            Create a budget to control your spending
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const pct = b.pct || 0;
            const remaining = parseFloat(b.amount) - parseFloat(b.spent || 0);
            const barColor =
              pct >= 100
                ? "#ef4444"
                : pct >= b.alert_at_pct
                  ? "#f59e0b"
                  : "#10b981";
            return (
              <div key={b.id} className="card-hover group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {b.name}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {b.category_name || "All expenses"} · {b.period}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pct >= 100 ? (
                      <AlertTriangle size={14} className="text-red-500" />
                    ) : pct >= b.alert_at_pct ? (
                      <AlertTriangle size={14} className="text-amber-500" />
                    ) : (
                      <CheckCircle size={14} className="text-emerald-500" />
                    )}
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    Spent{" "}
                    <strong className="text-gray-900 dark:text-white">
                      {formatINR(b.spent || 0)}
                    </strong>
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">
                    of {formatINR(b.amount)}
                  </span>
                </div>

                <div className="progress-bar mb-2">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: barColor,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: barColor }}
                  >
                    {pct}% used
                  </span>
                  <span
                    className={`text-xs ${remaining >= 0 ? "text-gray-400 dark:text-gray-500" : "text-red-600 dark:text-red-400 font-semibold"}`}
                  >
                    {remaining >= 0
                      ? `${formatINR(remaining)} left`
                      : `${formatINR(Math.abs(remaining))} over`}
                  </span>
                </div>

                {pct >= b.alert_at_pct && pct < 100 && (
                  <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-lg">
                    ⚠ Approaching limit — only {100 - pct}% remaining
                  </div>
                )}
                {pct >= 100 && (
                  <div className="mt-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 rounded-lg">
                    Over budget by {formatINR(Math.abs(remaining))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
