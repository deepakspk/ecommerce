import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import * as adminApi from "../../api/admin";
import EmptyState from "../../components/EmptyState";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { downloadBlob } from "../../utils/downloadBlob";
import { CARD_CLASS, INPUT_CLASS, SECTION_HEADING_CLASS } from "../../utils/ui";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

function toDateInput(d) {
  return d.toISOString().slice(0, 10);
}

function rangeForPreset(preset) {
  const today = new Date();
  if (preset === "today") return { from: toDateInput(today), to: toDateInput(today) };
  const days = preset === "7d" ? 6 : 29;
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { from: toDateInput(from), to: toDateInput(today) };
}

function fmtMoney(n) {
  return `Rs ${Number(n || 0).toLocaleString("en-NP", { maximumFractionDigits: 2 })}`;
}

function fmtShortDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-NP", { day: "2-digit", month: "short" });
}

function SalesOrdersChart({ data }) {
  if (!data.length) return <p className="text-sm text-gray-400 py-10 text-center">No sales in this range.</p>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tickFormatter={fmtShortDate} tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <YAxis yAxisId="orders" tick={{ fontSize: 11, fill: "#94a3b8" }} width={30} allowDecimals={false} />
        <YAxis
          yAxisId="sales"
          orientation="right"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          width={60}
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
        />
        <Tooltip
          labelFormatter={fmtShortDate}
          formatter={(value, name) => (name === "Sales" ? [fmtMoney(value), name] : [value, name])}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        <Line yAxisId="sales" type="monotone" dataKey="total" name="Sales" stroke="#16a34a" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Icon({ path, className = "w-6 h-6" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS = {
  cash: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 19.5h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z",
  orders: "M3 7.5l9-4.5 9 4.5M3 7.5l9 4.5 9-4.5M3 7.5v9l9 4.5 9-4.5v-9",
  users: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  trend: "M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941",
};

const CARD_TONES = {
  blue: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400", iconBg: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" },
  green: { bg: "bg-green-50 dark:bg-green-950/40", text: "text-green-700 dark:text-green-400", iconBg: "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", iconBg: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400", iconBg: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400" },
};

function StatCard({ icon, tone, label, value }) {
  const t = CARD_TONES[tone];
  return (
    <div className={`${t.bg} rounded-lg p-5 flex items-center gap-4`}>
      <span className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${t.iconBg}`}>
        <Icon path={ICONS[icon]} className="w-7 h-7" />
      </span>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${t.text}`}>{value}</p>
      </div>
    </div>
  );
}

function rateTone(rate) {
  if (rate >= 80) return { bar: "bg-green-500", text: "text-green-600 dark:text-green-400" };
  if (rate >= 50) return { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
}

function TopDistrictsTable({ rows }) {
  return (
    <div className={`${CARD_CLASS} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top Districts by Delivery Success Rate</h2>
        <div className="flex items-center gap-3 text-[11px] font-medium">
          <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">≥ 80% Good</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400">50 – 79% Average</span>
          <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400">&lt; 50% Low</span>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/60 dark:border-gray-700">
            <tr>
              <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-10">#</th>
              <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">District</th>
              <th className="text-right px-5 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Orders</th>
              <th className="text-right px-5 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Delivered</th>
              <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Delivered Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r, i) => {
              const tone = rateTone(r.deliveredRate);
              return (
                <tr key={r.district}>
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200">{r.district}</td>
                  <td className="px-5 py-3 text-right text-brand-600 dark:text-brand-400 font-medium">{r.totalOrders}</td>
                  <td className="px-5 py-3 text-right text-green-600 dark:text-green-400 font-medium">{r.delivered}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${tone.bar}`}
                          style={{ width: `${Math.min(100, r.deliveredRate)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold w-12 text-right ${tone.text}`}>{r.deliveredRate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ProductTable({ title, rows, metric }) {
  return (
    <div className={`${CARD_CLASS} overflow-hidden`}>
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/60 dark:border-gray-700">
            <tr>
              <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Product</th>
              <th className="text-right px-5 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{metric}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.productName}>
                <td className="px-5 py-2 text-gray-700 dark:text-gray-300">{r.productName}</td>
                <td className="px-5 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                  {metric === "Revenue" ? fmtMoney(r.revenue) : r.units}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [preset, setPreset] = useState("7d");
  const [customFrom, setCustomFrom] = useState(rangeForPreset("7d").from);
  const [customTo, setCustomTo] = useState(rangeForPreset("7d").to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const { from, to } = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return rangeForPreset(preset);
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await adminApi.getReportSummary({ from, to });
        if (!active) return;
        setData(result);
        setError("");
      } catch (e) {
        if (active) setError(e.response?.data?.message || "Failed to load report");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [from, to]);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await adminApi.exportOrdersCsv({ from, to });
      downloadBlob(blob, `orders-${from}-to-${to}.csv`);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <AdminPageHeader
        title="Reports"
        action={
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-white text-brand-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          className={`${INPUT_CLASS} w-auto`}
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {preset === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className={`${INPUT_CLASS} w-auto`}
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className={`${INPUT_CLASS} w-auto`}
            />
          </>
        )}
      </div>

      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : !data ? (
        <EmptyState title="No report data available." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon="cash" tone="green" label="Total Sales" value={fmtMoney(data.summary.totalSales)} />
            <StatCard icon="orders" tone="blue" label="Total Orders" value={data.summary.totalOrders} />
            <StatCard icon="users" tone="purple" label="New Customers" value={data.summary.newCustomers} />
            <StatCard icon="trend" tone="amber" label="Avg Order Value" value={fmtMoney(data.summary.avgOrderValue)} />
          </div>

          <div className={`${CARD_CLASS} p-5`}>
            <h2 className={`${SECTION_HEADING_CLASS} mb-4`}>Sales & Orders Trend</h2>
            <SalesOrdersChart data={data.salesOverTime} />
          </div>

          <TopDistrictsTable rows={data.topDistricts || []} />

          <div className="grid sm:grid-cols-2 gap-4">
            <ProductTable title="Top products by revenue" rows={data.topProductsByRevenue} metric="Revenue" />
            <ProductTable title="Top products by units sold" rows={data.topProductsByUnits} metric="Units" />
          </div>
        </div>
      )}
    </div>
  );
}
