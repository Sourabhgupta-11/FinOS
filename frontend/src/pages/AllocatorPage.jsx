import { useState } from "react";
import api, { formatINR } from "../utils/api";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
  Home,
  Car,
  Plane,
  Briefcase,
  TrendingUp,
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

// Goal-specific extra questions
const GOAL_DETAILS = {
  house: {
    label: "Buying a house",
    icon: Home,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40",
    fields: [
      {
        key: "houseCity",
        label: "Which city?",
        type: "select",
        options: [
          "Metro (Mumbai/Delhi/Bengaluru/Chennai)",
          "Tier 2 (Pune/Hyderabad/Ahmedabad)",
          "Tier 3 / Small city",
        ],
      },
      {
        key: "houseType",
        label: "Property type?",
        type: "select",
        options: ["1 BHK", "2 BHK", "3 BHK", "4+ BHK / Villa", "Plot / Land"],
      },
      {
        key: "houseBudget",
        label: "Budget (₹ crore)",
        type: "select",
        options: [
          "Under ₹30 lakh",
          "₹30L – ₹75L",
          "₹75L – ₹1.5 crore",
          "₹1.5 – ₹3 crore",
          "₹3 – ₹5 crore",
          "Above ₹5 crore",
        ],
      },
      {
        key: "houseTimeline",
        label: "Target timeline?",
        type: "select",
        options: ["1–2 years", "3–5 years", "5–10 years", "After 10 years"],
      },
      {
        key: "houseLoan",
        label: "Plan to take home loan?",
        type: "select",
        options: [
          "Yes – 80%+ financing",
          "Yes – 50% financing",
          "Minimal loan / self-funded",
          "Not sure yet",
        ],
      },
    ],
  },
  car: {
    label: "Buying a car",
    icon: Car,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40",
    fields: [
      {
        key: "carType",
        label: "Car segment?",
        type: "select",
        options: [
          "Hatchback / Entry (₹5L–₹10L)",
          "Sedan / Compact SUV (₹10L–₹20L)",
          "Mid-size SUV (₹20L–₹35L)",
          "Premium (₹35L–₹60L)",
          "Luxury / Electric (Above ₹60L)",
        ],
      },
      {
        key: "carFuel",
        label: "Fuel type?",
        type: "select",
        options: [
          "Petrol",
          "Diesel",
          "CNG",
          "Electric (EV)",
          "Hybrid",
          "Not decided",
        ],
      },
      {
        key: "carTimeline",
        label: "When do you plan to buy?",
        type: "select",
        options: ["Within 6 months", "6–12 months", "1–2 years", "2–3 years"],
      },
      {
        key: "carLoan",
        label: "Financing plan?",
        type: "select",
        options: [
          "Full cash purchase",
          "Partial loan (30–50%)",
          "EMI / mostly financed",
          "Not sure",
        ],
      },
    ],
  },
  travel: {
    label: "Travel / Vacation",
    icon: Plane,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/40",
    fields: [
      {
        key: "travelDestination",
        label: "Dream destination?",
        type: "select",
        options: [
          "Europe (10–15 days)",
          "Southeast Asia (Thailand/Bali/Vietnam)",
          "USA / Canada",
          "Japan / South Korea",
          "Domestic India",
          "Australia / NZ",
          "Middle East / Dubai",
          "World tour / Extended travel",
        ],
      },
      {
        key: "travelFrequency",
        label: "How often?",
        type: "select",
        options: [
          "Once in a lifetime big trip",
          "Once a year",
          "Twice a year",
          "Every quarter",
          "Multiple times a year",
        ],
      },
      {
        key: "travelBudget",
        label: "Budget per trip?",
        type: "select",
        options: [
          "Under ₹50,000",
          "₹50K – ₹1L",
          "₹1L – ₹2.5L",
          "₹2.5L – ₹5L",
          "₹5L – ₹10L",
          "Above ₹10L",
        ],
      },
      {
        key: "travelTimeline",
        label: "Next trip timeline?",
        type: "select",
        options: ["Within 6 months", "6–12 months", "1–2 years", "2–3 years"],
      },
    ],
  },
  retire: {
    label: "Early retirement / FIRE",
    icon: Briefcase,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/40",
    fields: [
      {
        key: "retireAge",
        label: "Target retirement age?",
        type: "select",
        options: [
          "Before 40 (Extreme FIRE)",
          "40–45",
          "45–50",
          "50–55",
          "55–60",
          "Standard 60",
        ],
      },
      {
        key: "retireLifestyle",
        label: "Retirement lifestyle?",
        type: "select",
        options: [
          "Lean FIRE – minimal (₹30K–₹50K/month)",
          "Regular – comfortable (₹50K–₹1L/month)",
          "Fat FIRE – premium (₹1L–₹2L/month)",
          "Luxury FIRE (₹2L+/month)",
        ],
      },
      {
        key: "retireLocation",
        label: "Where do you plan to retire?",
        type: "select",
        options: [
          "Same city I live now",
          "Tier 2 / smaller Indian city",
          "Rural India / hometown",
          "Southeast Asia (Bali/Thailand)",
          "Other country",
        ],
      },
      {
        key: "retireCorpus",
        label: "Have you estimated retirement corpus?",
        type: "select",
        options: [
          "Not yet",
          "₹1–2 crore",
          "₹2–5 crore",
          "₹5–10 crore",
          "₹10+ crore",
        ],
      },
    ],
  },
  wealth: {
    label: "Wealth creation",
    icon: TrendingUp,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40",
    fields: [
      {
        key: "wealthTarget",
        label: "Wealth target (₹)?",
        type: "select",
        options: [
          "₹25 lakh (starter)",
          "₹50 lakh",
          "₹1 crore",
          "₹2–3 crore",
          "₹5 crore",
          "₹10 crore+",
        ],
      },
      {
        key: "wealthTimeline",
        label: "Target timeline?",
        type: "select",
        options: ["5 years", "10 years", "15 years", "20 years", "25+ years"],
      },
      {
        key: "wealthInstruments",
        label: "Preferred instruments?",
        type: "select",
        options: [
          "Mostly equity MF / Index funds",
          "Mix of equity + debt",
          "Include direct stocks",
          "Real estate + equity",
          "Include international funds",
          "Open to all options",
        ],
      },
      {
        key: "wealthExisting",
        label: "Existing investments?",
        type: "select",
        options: [
          "Starting fresh",
          "₹1–5 lakh already invested",
          "₹5–25 lakh",
          "₹25L–₹1 crore",
          "₹1 crore+",
        ],
      },
    ],
  },
};

// Generate human-readable goal context for backend
function buildGoalContext(goal, details) {
  if (!details || !GOAL_DETAILS[goal]) return "";
  const g = GOAL_DETAILS[goal];
  const parts = g.fields
    .filter((f) => details[f.key])
    .map((f) => `${f.label}: ${details[f.key]}`);
  return parts.length > 0 ? `\nGoal details: ${parts.join(" | ")}` : "";
}

export default function AllocatorPage() {
  const [form, setForm] = useState({
    salary: "",
    age: "",
    riskLevel: "medium",
    goal: "wealth",
    monthlyExpenses: "",
    hasInsurance: false,
    emergencyFundMonths: 0,
  });
  const [goalDetails, setGoalDetails] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1=basic, 2=goal details
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setDetail = (k, v) => setGoalDetails((p) => ({ ...p, [k]: v }));

  const currentGoal = GOAL_DETAILS[form.goal];
  const GoalIcon = currentGoal?.icon;

  const handleBasicNext = (e) => {
    e.preventDefault();
    if (!form.salary || !form.age) return;
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Validate inputs
      const salaryNum = parseFloat(form.salary);
      const ageNum = parseInt(form.age);

      if (!salaryNum || salaryNum < 1000) {
        setError("Salary must be at least ₹1,000");
        setLoading(false);
        return;
      }

      if (!ageNum || ageNum < 18 || ageNum > 80) {
        setError("Age must be between 18 and 80");
        setLoading(false);
        return;
      }

      const goalCtx = buildGoalContext(form.goal, goalDetails);
      const requestData = {
        salary: salaryNum,
        age: ageNum,
        riskLevel: form.riskLevel,
        goal: form.goal,
        hasInsurance: form.hasInsurance,
        emergencyFundMonths: parseInt(form.emergencyFundMonths),
      };

      // Only include monthlyExpenses if provided
      if (form.monthlyExpenses && form.monthlyExpenses.trim()) {
        requestData.monthlyExpenses = parseFloat(form.monthlyExpenses);
      }

      if (goalCtx) {
        requestData.goalContext = goalCtx;
      }

      const res = await api.post("/finance/allocate", requestData);
      setResult(res.data);
      setStep(3);
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
    setStep(1);
    setGoalDetails({});
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

  // Step indicators
  const STEPS = [
    { n: 1, label: "Your profile" },
    { n: 2, label: "Goal details" },
    { n: 3, label: "Your allocation" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Salary Allocator
        </h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
          Get a smart, goal-specific breakdown of your money
        </p>
      </div>

      {/* Step indicator */}
      {!result && (
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${step === s.n ? "text-blue-600 dark:text-blue-400" : step > s.n ? "text-emerald-600 dark:text-emerald-400" : "text-gray-300 dark:text-gray-600"}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${step === s.n ? "bg-blue-600 text-white" : step > s.n ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}
                >
                  {step > s.n ? "✓" : s.n}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px w-8 ${step > s.n ? "bg-emerald-300 dark:bg-emerald-700" : "bg-gray-200 dark:bg-gray-700"}`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 3: RESULTS ───────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-4 page-enter">
          {/* Score + goal summary */}
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
                Goal: {currentGoal?.label || form.goal}
                {goalDetails[Object.keys(goalDetails)[0]] && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    · {Object.values(goalDetails)[0]}
                  </span>
                )}
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
            Recalculate with different inputs
          </button>
        </div>
      )}

      {/* ── STEP 1: BASIC PROFILE ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="card page-enter">
          <div className="section-title">Tell us about yourself</div>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-xl mb-4 border border-red-100 dark:border-red-800/40">
              {error}
            </div>
          )}
          <form onSubmit={handleBasicNext} className="space-y-4">
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
                <label className="label">Primary goal</label>
                <select
                  className="input"
                  value={form.goal}
                  onChange={(e) => {
                    set("goal", e.target.value);
                    setGoalDetails({});
                  }}
                >
                  <option value="wealth">Wealth creation</option>
                  <option value="house">Buy a house</option>
                  <option value="car">Buy a car</option>
                  <option value="travel">Travel & lifestyle</option>
                  <option value="retire">Early retirement</option>
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
            <button type="submit" className="btn-primary w-full">
              Next: Goal Details →
            </button>
          </form>
        </div>
      )}

      {/* ── STEP 2: GOAL DETAILS ─────────────────────────────────────── */}
      {step === 2 && currentGoal && (
        <div className="space-y-4 page-enter">
          {/* Goal header */}
          <div className={`card ${currentGoal.bg}`}>
            <div className={`flex items-center gap-3 ${currentGoal.color}`}>
              <GoalIcon size={22} />
              <div>
                <div className="font-bold text-gray-900 dark:text-white text-base">
                  {currentGoal.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Tell us more so we can personalise your allocation plan
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-title">Goal details</div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {currentGoal.fields.map((field) => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      className="input"
                      value={goalDetails[field.key] || ""}
                      onChange={(e) => setDetail(field.key, e.target.value)}
                    >
                      <option value="">Select an option…</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input"
                      type={field.type}
                      placeholder={field.placeholder}
                      value={goalDetails[field.key] || ""}
                      onChange={(e) => setDetail(field.key, e.target.value)}
                    />
                  )}
                </div>
              ))}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-xl border border-red-100 dark:border-red-800/40">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary text-sm py-2.5"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? "Calculating…" : "Calculate my allocation →"}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 py-1"
              >
                Skip goal details and calculate now
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
