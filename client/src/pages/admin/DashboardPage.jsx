import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useAuth } from "../../hooks/useAuth";
import * as adminApi from "../../api/admin";
import Badge from "../../components/Badge";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { CARD_CLASS } from "../../utils/ui";

const fmt = (n) => `Rs. ${Number(n ?? 0).toLocaleString()}`;
const fmtShortDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NP", { day: "2-digit", month: "short" });
const fmtFullDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-NP", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";

const STATUS_COLORS = {
  PENDING: "#d97706",
  CONFIRMED: "#4f46e5",
  PACKED: "#4f46e5",
  PICKED: "#0891b2",
  SHIPPED: "#2563eb",
  ARRIVED: "#7c3aed",
  OUT_FOR_DELIVERY: "#0d9488",
  DELIVERED: "#16a34a",
  CANCELLED: "#dc2626",
};

function Icon({ path, className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS = {
  orders: "M3 7.5l9-4.5 9 4.5M3 7.5l9 4.5 9-4.5M3 7.5v9l9 4.5 9-4.5v-9",
  truck: "M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.9 17.9 0 0 0-3.213-9.193 2.06 2.06 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.55 48.55 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 0h-12",
  returnArrow: "M9 15L3 9m0 0l6-6M3 9h12a6 6 0 0 1 0 12h-3",
  percent: "M6 18L18 6M8 8a2 2 0 1 0-4 0 2 2 0 0 0 4 0Zm12 8a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z",
  clock: "M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  process: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99",
  cash: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 19.5h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z",
  package: "M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25M21 7.5v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9.75v9.75",
  alert: "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z",
};

function StatCard({ icon, label, value, sub, tone, to }) {
  const TONES = {
    blue: { bg: "bg-blue-50", border: "border-blue-100", iconBg: "bg-blue-100 text-blue-600" },
    green: { bg: "bg-green-50", border: "border-green-100", iconBg: "bg-green-100 text-green-600" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", iconBg: "bg-amber-100 text-amber-600" },
    red: { bg: "bg-red-50", border: "border-red-100", iconBg: "bg-red-100 text-red-600" },
    teal: { bg: "bg-teal-50", border: "border-teal-100", iconBg: "bg-teal-100 text-teal-600" },
    indigo: { bg: "bg-indigo-50", border: "border-indigo-100", iconBg: "bg-indigo-100 text-indigo-600" },
    purple: { bg: "bg-purple-50", border: "border-purple-100", iconBg: "bg-purple-100 text-purple-600" },
    cyan: { bg: "bg-cyan-50", border: "border-cyan-100", iconBg: "bg-cyan-100 text-cyan-600" },
  };
  const t = TONES[tone];
  const card = (
    <div
      className={`${t.bg} border ${t.border} rounded-xl p-4 h-full flex items-center gap-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]`}
    >
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${t.iconBg}`}>
        <Icon path={ICONS[icon]} className="w-6 h-6" />
      </span>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs font-semibold text-gray-600">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

function ChartCard({ title, action, children }) {
  return (
    <div className={`${CARD_CLASS} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueClass = "text-gray-900" }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([adminApi.getDashboardStats(), adminApi.listAdminOrders({ limit: 5 })])
      .then(([s, o]) => {
        setStats(s);
        setRecentOrders(o.orders);
      })
      .catch((e) => setError(e.response?.data?.message || "Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  const dataReady = !loading && !!stats;
  const totals = stats?.totals;
  const today = stats?.today;
  const values = stats?.values;
  const cod = stats?.cod;
  const charts = stats?.charts;

  return (
    <div className="p-4 sm:p-8">
      <AdminPageHeader title="Dashboard" subtitle={`Welcome back, ${user?.name || ""}`} />

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-6">{error}</p>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon="orders" tone="blue" label="Total Orders" sub="All time" value={!dataReady ? "…" :totals.totalOrders} to="/admin/orders" />
        <StatCard icon="truck" tone="green" label="Delivered" sub="All time" value={!dataReady ? "…" :totals.deliveredCount} to="/admin/orders?status=DELIVERED" />
        <StatCard icon="returnArrow" tone="amber" label="Returns Refunded" sub="All time" value={!dataReady ? "…" :totals.returnsRefundedCount} to="/admin/returns?status=REFUNDED" />
        <StatCard icon="percent" tone="red" label="Return Rate" sub="Returns / orders" value={!dataReady ? "…" :`${totals.returnRate}%`} to="/admin/returns" />
        <StatCard icon="truck" tone="cyan" label="In Delivery" sub="Shipped → out for delivery" value={!dataReady ? "…" :totals.inDeliveryCount} to="/admin/orders" />
        <StatCard icon="clock" tone="indigo" label="Pending Orders" sub="Awaiting confirmation" value={!dataReady ? "…" :totals.pendingOrders} to="/admin/orders?status=PENDING" />
        <StatCard icon="process" tone="purple" label="Returns In Process" sub="Requested → picked up" value={!dataReady ? "…" :totals.returnsInProcessCount} to="/admin/returns?status=REQUESTED" />
        <StatCard icon="cash" tone="teal" label="Pending COD" sub="Not yet collected" value={!dataReady ? "…" :fmt(totals.pendingCOD)} />
      </div>

      {totals && totals.lowStockCount > 0 && (
        <Link
          to="/admin/inventory"
          className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-6 hover:bg-amber-100 transition-colors"
        >
          <Icon path={ICONS.alert} className="w-4 h-4 flex-shrink-0" />
          {totals.lowStockCount} variant{totals.lowStockCount !== 1 ? "s" : ""} running low on stock — review inventory →
        </Link>
      )}

      {/* Hero trend chart */}
      <div className="mb-6">
        <ChartCard title="Sales & Orders Trend — Last 30 Days">
          {!dataReady ? (
            <div className="h-72 bg-gray-50 rounded-md animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={fmtShortDate} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis yAxisId="orders" tick={{ fontSize: 11, fill: "#94a3b8" }} width={30} />
                <YAxis yAxisId="sales" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} width={60} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  labelFormatter={fmtShortDate}
                  formatter={(value, name) => (name === "Sales" ? [fmt(value), name] : [value, name])}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line yAxisId="sales" type="monotone" dataKey="sales" name="Sales" stroke="#16a34a" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Breakdown charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard title="Order Status">
          {!dataReady ? (
            <div className="h-56 bg-gray-50 rounded-md animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.statusBreakdown} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="count" name="Orders" radius={[6, 6, 0, 0]}>
                  {charts.statusBreakdown.map((row) => (
                    <Cell key={row.status} fill={STATUS_COLORS[row.status] || "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Delivered vs Returned">
          {!dataReady ? (
            <div className="h-56 bg-gray-50 rounded-md animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Delivered", value: charts.deliveredVsReturned.delivered },
                    { name: "Returned", value: charts.deliveredVsReturned.returned },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  <Cell fill="#16a34a" />
                  <Cell fill="#dc2626" />
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="COD Order Value — Last 7 Days">
          {!dataReady ? (
            <div className="h-56 bg-gray-50 rounded-md animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.codTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="codGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtShortDate} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip labelFormatter={fmtShortDate} formatter={(value) => fmt(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="value" name="COD Value" stroke="#0d9488" strokeWidth={2.5} fill="url(#codGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Info panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <div className={`${CARD_CLASS} p-5`}>
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Today's Details</h2>
          {!dataReady ? (
            <div className="h-32 bg-gray-50 rounded-md animate-pulse" />
          ) : (
            <>
              <InfoRow label="Today's Orders" value={today.orders} />
              <InfoRow label="Today's Revenue" value={fmt(today.revenue)} />
              <InfoRow label="Today's Delivered" value={today.delivered} valueClass="text-green-600" />
              <InfoRow label="Today's Returns" value={today.returns} valueClass="text-red-600" />
            </>
          )}
        </div>

        <div className={`${CARD_CLASS} p-5`}>
          <h2 className="text-sm font-semibold text-gray-800 mb-2">COD Info</h2>
          {!dataReady ? (
            <div className="h-32 bg-gray-50 rounded-md animate-pulse" />
          ) : (
            <>
              <InfoRow label="Last Paid COD Date" value={fmtFullDate(cod.lastDate)} />
              <InfoRow label="Last Paid COD Amount" value={cod.lastAmount != null ? fmt(cod.lastAmount) : "N/A"} />
              <InfoRow label="Pending COD" value={fmt(cod.pendingCOD)} valueClass="text-amber-600" />
              <InfoRow label="Avg. Delivery Fee" value={fmt(cod.avgDeliveryFee)} />
            </>
          )}
        </div>

        <div className={`${CARD_CLASS} p-5`}>
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Order Values</h2>
          {!dataReady ? (
            <div className="h-32 bg-gray-50 rounded-md animate-pulse" />
          ) : (
            <>
              <InfoRow label="Order Value" value={fmt(values.orderValue)} />
              <InfoRow label="Delivered Value" value={fmt(values.deliveredValue)} valueClass="text-green-600" />
              <InfoRow label="Returned Value" value={fmt(values.returnedValue)} valueClass="text-red-600" />
              <InfoRow label="Pending Value" value={fmt(values.pendingValue)} valueClass="text-amber-600" />
            </>
          )}
        </div>

        <div className={`${CARD_CLASS} p-5`}>
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Return Rate — Last 3 Months</h2>
          {!dataReady ? (
            <div className="h-32 bg-gray-50 rounded-md animate-pulse" />
          ) : (
            charts.returnRateByMonth.map((m) => (
              <div key={m.month} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-medium text-gray-700">{m.month}</p>
                  <p className="text-[11px] text-gray-400">{m.returns} returns / {m.orders} orders</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.rate > 5 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                  {m.rate}%
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className={`${CARD_CLASS} overflow-hidden mb-8`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        {loading ? (
          <p className="px-5 py-6 text-sm text-gray-400">Loading…</p>
        ) : recentOrders.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map((o) => (
                <tr key={o._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link to={`/admin/orders/${o._id}`} className="text-brand-600 hover:underline font-mono text-xs">
                      #{o._id.slice(-8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{o.userId?.name || "—"}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{fmt(o.total)}</td>
                  <td className="px-5 py-3">
                    <Badge kind="order" status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Link to="/admin/products/new" className="bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors">
          + New Product
        </Link>
        <Link to="/admin/orders" className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
          Manage Orders
        </Link>
        <Link to="/admin/inventory" className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
          View Inventory
        </Link>
      </div>
    </div>
  );
}
