import { useState, useEffect } from "react";
import api, { formatINR } from "../utils/api";
import { usePremium } from "../hooks/usePremium";
import PremiumGate from "../components/PremiumGate";
import {
  Plus,
  Link2,
  Landmark,
  CreditCard,
  Wallet,
  Trash2,
  RefreshCw,
  Clock,
} from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "savings", label: "Savings Account" },
  { value: "current", label: "Current Account" },
  { value: "salary", label: "Salary Account" },
  { value: "credit_card", label: "Credit Card" },
  { value: "demat", label: "Demat / Trading Account" },
  { value: "loan", label: "Loan Account" },
  { value: "rd", label: "Recurring Deposit (RD)" },
  { value: "fd", label: "Fixed Deposit (FD)" },
  { value: "ppf", label: "PPF Account" },
  { value: "nps", label: "NPS Account" },
  { value: "wallet", label: "Digital Wallet (Paytm/PhonePe)" },
];

const POPULAR_BANKS = [
  "SBI",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Yes Bank",
  "IDFC First Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank",
  "Federal Bank",
  "IndusInd Bank",
  "AU Small Finance Bank",
  "Ujjivan SFB",
  "RBL Bank",
  "IDBI Bank",
];

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#64748b",
];

const EMPTY_FORM = {
  accountName: "",
  bankName: "",
  accountType: "savings",
  accountNumber: "",
  ifscCode: "",
  creditLimit: "",
  color: COLORS[0],
};

export default function BankAccountsPage() {
  const { isPro, loading: premLoading } = usePremium();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [setuPhone, setSetuPhone] = useState("");
  const [setuLoading, setSetuLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!premLoading && isPro) load();
    else if (!premLoading) setLoading(false);
  }, [premLoading, isPro]);

  async function load() {
    try {
      const res = await api.get("/bank/accounts");
      setAccounts(res.data.accounts || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setFormError("");
    if (!form.accountNumber.trim()) {
      setFormError("Account number is required");
      return;
    }
    if (
      !["wallet", "demat"].includes(form.accountType) &&
      !form.ifscCode.trim()
    ) {
      setFormError("IFSC code is required");
      return;
    }
    try {
      const masked = form.accountNumber.replace(/\d(?=\d{4})/g, "X");
      await api.post("/bank/accounts", {
        accountName: form.accountName,
        bankName: form.bankName,
        accountType: form.accountType,
        accountNumberMasked: masked,
        ifscCode: form.ifscCode || null,
        creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : null,
        color: form.color,
        // balance intentionally NOT sent — fetched from bank
      });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to add account");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remove this account? Linked transactions will remain."))
      return;
    await api.delete(`/bank/accounts/${id}`).catch(() => {});
    load();
  }

  async function handleSync(accountId) {
    setSyncing(accountId);
    try {
      await api.post("/bank/setu/callback", { accountId, consentId: "mock" });
      await load();
    } catch {
    } finally {
      setSyncing(null);
    }
  }

  async function handleSetuLink() {
    if (!setuPhone.trim()) return;
    setSetuLoading(true);
    try {
      const res = await api.post("/bank/setu/consent", { phone: setuPhone });
      if (res.data.redirectUrl) {
        window.open(
          res.data.redirectUrl,
          "_blank",
          "width=480,height=700,scrollbars=yes",
        );
        alert(
          "Complete bank linking in the popup. Balance and transactions will sync automatically.",
        );
      } else {
        alert(res.data.message || "Bank linking initiated");
      }
    } catch (err) {
      alert(
        err.response?.data?.error ||
          "Bank linking unavailable. Please add manually.",
      );
    } finally {
      setSetuLoading(false);
    }
  }

  // Compute totals from accounts where balance is already fetched
  const totalBalance = accounts
    .filter(
      (a) =>
        !["credit_card", "loan"].includes(a.account_type) && a.balance != null,
    )
    .reduce((s, a) => s + parseFloat(a.balance || 0), 0);
  const totalDebt = accounts
    .filter((a) => a.account_type === "credit_card" && a.balance != null)
    .reduce((s, a) => s + parseFloat(a.balance || 0), 0);

  if (premLoading)
    return <div className="text-gray-400 animate-pulse text-sm">Loading…</div>;
  if (!isPro)
    return <PremiumGate requiredPlan="pro" feature="Bank Account Linking" />;

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-l-4 border-amber-500 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="font-bold text-amber-900 dark:text-amber-300">
              Coming Soon!
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-400 mt-0.5">
              Bank Account Linking is launching in the next update. Stay tuned
              for secure account connections via Setu!
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between opacity-50 pointer-events-none">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Bank Accounts
          </h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
            Link accounts — balance fetched automatically
          </p>
        </div>
        <button
          disabled
          className="btn-primary text-sm py-2 flex items-center gap-2 opacity-50 cursor-not-allowed"
        >
          <Plus size={14} /> Add account
        </button>
      </div>

      {/* Totals — only if we have balance data */}
      {accounts.some((a) => a.balance != null) && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total balance",
              value: formatINR(totalBalance),
              color: "text-gray-900 dark:text-white",
            },
            {
              label: "Credit card debt",
              value: formatINR(totalDebt),
              color:
                totalDebt > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-900 dark:text-white",
            },
            {
              label: "Net liquid",
              value: formatINR(totalBalance - totalDebt),
              color:
                totalBalance - totalDebt >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
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
      )}

      {/* Setu AA */}
      <div className="card border-blue-100 dark:border-blue-900/40 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center gap-2 mb-2">
          <Link2 size={15} className="text-blue-600 dark:text-blue-400" />
          <div className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            Auto-link via Account Aggregator
          </div>
          <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
            RBI Approved
          </span>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
          Securely import balance and transactions automatically. Works with all
          major Indian banks. Balance refreshes every 30 days.
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            type="tel"
            placeholder="Mobile number linked to your bank"
            value={setuPhone}
            onChange={(e) => setSetuPhone(e.target.value.replace(/\D/g, ""))}
            maxLength={10}
          />
          <button
            onClick={handleSetuLink}
            disabled={setuLoading || setuPhone.length < 10}
            className="btn-primary text-sm py-2 px-4 whitespace-nowrap flex items-center gap-1.5"
          >
            <Link2 size={13} />
            {setuLoading ? "Opening…" : "Link bank"}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Add account manually
          </h3>
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-xl mb-4">
              {formError}
            </div>
          )}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs px-3 py-2 rounded-xl mb-4 flex items-center gap-2">
            <Clock size={12} className="flex-shrink-0" />
            Balance will be automatically fetched after account is linked. No
            need to enter it manually.
          </div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">
                  Account nickname <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  placeholder="e.g. HDFC Salary Account"
                  value={form.accountName}
                  onChange={(e) => set("accountName", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">
                  Bank name <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  list="banks"
                  placeholder="HDFC Bank"
                  value={form.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                  required
                />
                <datalist id="banks">
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label">
                  Account type <span className="text-red-500">*</span>
                </label>
                <select
                  className="input"
                  value={form.accountType}
                  onChange={(e) => set("accountType", e.target.value)}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  Account number <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  placeholder="1234567890123456"
                  value={form.accountNumber}
                  onChange={(e) =>
                    set("accountNumber", e.target.value.replace(/\D/g, ""))
                  }
                  maxLength={20}
                  required
                />
              </div>
              {!["wallet", "demat"].includes(form.accountType) && (
                <div>
                  <label className="label">
                    IFSC code <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input uppercase"
                    placeholder="HDFC0001234"
                    value={form.ifscCode}
                    onChange={(e) =>
                      set("ifscCode", e.target.value.toUpperCase())
                    }
                    maxLength={11}
                    required
                  />
                </div>
              )}
              {form.accountType === "credit_card" && (
                <div>
                  <label className="label">Credit limit (₹)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder="100000"
                    value={form.creditLimit}
                    onChange={(e) => set("creditLimit", e.target.value)}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="label">Card colour</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    className={`w-8 h-8 rounded-xl transition-all ${form.color === c ? "scale-110 ring-2 ring-offset-2 ring-gray-300 dark:ring-offset-gray-900" : "hover:scale-105"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm py-2">
                Add account
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setFormError("");
                  setForm(EMPTY_FORM);
                }}
                className="btn-secondary text-sm py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account cards */}
      {loading ? (
        <div className="text-gray-400 dark:text-gray-600 animate-pulse text-sm">
          Loading accounts…
        </div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-14">
          <Landmark
            size={36}
            className="text-gray-200 dark:text-gray-700 mx-auto mb-3"
          />
          <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            No accounts added yet
          </div>
          <div className="text-gray-400 dark:text-gray-600 text-xs mt-1">
            Link via Setu AA or add manually above
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {accounts.map((acc) => {
            const isCC = acc.account_type === "credit_card";
            const hasBalance = acc.balance != null;
            const utilPct =
              isCC && acc.credit_limit > 0 && hasBalance
                ? Math.round((acc.balance / acc.credit_limit) * 100)
                : null;
            const barColor = !utilPct
              ? "#10b981"
              : utilPct > 80
                ? "#ef4444"
                : utilPct > 50
                  ? "#f59e0b"
                  : "#10b981";
            const needsRefresh =
              acc.last_synced &&
              Date.now() - new Date(acc.last_synced).getTime() >
                30 * 24 * 60 * 60 * 1000;

            return (
              <div
                key={acc.id}
                className="card-hover relative overflow-hidden group"
              >
                <div
                  className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl"
                  style={{ background: acc.color }}
                />
                <div className="pl-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {acc.account_name}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {acc.bank_name}
                        {acc.account_number_masked
                          ? ` · ${acc.account_number_masked}`
                          : ""}
                      </div>
                      <div className="text-xs text-gray-300 dark:text-gray-600 capitalize">
                        {ACCOUNT_TYPES.find((t) => t.value === acc.account_type)
                          ?.label || acc.account_type}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleSync(acc.id)}
                        disabled={syncing === acc.id}
                        className="btn-ghost w-7 h-7 flex items-center justify-center"
                        title="Refresh balance"
                      >
                        <RefreshCw
                          size={12}
                          className={syncing === acc.id ? "animate-spin" : ""}
                        />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="btn-ghost w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Balance — shows "Pending sync" if not yet fetched */}
                  {hasBalance ? (
                    <div
                      className={`text-2xl font-bold tabular-nums ${isCC && acc.balance > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}
                    >
                      {formatINR(acc.balance)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-400 dark:text-gray-500">
                        Balance pending sync
                      </div>
                      <button
                        onClick={() => handleSync(acc.id)}
                        disabled={syncing === acc.id}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw
                          size={10}
                          className={syncing === acc.id ? "animate-spin" : ""}
                        />
                        {syncing === acc.id ? "Syncing…" : "Sync now"}
                      </button>
                    </div>
                  )}

                  {/* Credit utilisation */}
                  {isCC && acc.credit_limit > 0 && hasBalance && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 dark:text-gray-500">
                          {formatINR(acc.balance)} of{" "}
                          {formatINR(acc.credit_limit)}
                        </span>
                        <span
                          style={{ color: barColor }}
                          className="font-semibold"
                        >
                          {utilPct}% used
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(utilPct, 100)}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-300 dark:text-gray-600">
                    {acc.last_synced && (
                      <span
                        className={
                          needsRefresh
                            ? "text-amber-500 dark:text-amber-400"
                            : ""
                        }
                      >
                        {needsRefresh ? "⚠ Refresh needed · " : ""}
                        Last sync:{" "}
                        {new Date(acc.last_synced).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
