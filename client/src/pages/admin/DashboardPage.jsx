import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import * as adminApi from "../../api/admin";

const fmt = n => `Rs. ${Number(n).toLocaleString()}`;

const STATUS_COLORS = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PACKED:    "bg-purple-100 text-purple-700",
  SHIPPED:   "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      adminApi.getDashboardStats(),
      adminApi.listAdminOrders({ limit: 5 }),
    ])
      .then(([s, o]) => {
        setStats(s);
        setRecentOrders(o.orders);
      })
      .catch((e) => setError(e.response?.data?.message || "Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">Welcome back, {user?.name}</p>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-6">{error}</p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Total Sales"
          value={loading ? "…" : fmt(stats?.totalSales ?? 0)}
          sub="All non-cancelled orders"
          color="blue"
        />
        <StatCard
          label="Today's Orders"
          value={loading ? "…" : stats?.todayOrders ?? 0}
          sub="Orders placed today"
          color="indigo"
        />
        <StatCard
          label="Pending Orders"
          value={loading ? "…" : stats?.pendingOrders ?? 0}
          sub="Need confirmation"
          color="yellow"
          to="/admin/orders?status=PENDING"
        />
        <StatCard
          label="Low Stock"
          value={loading ? "…" : stats?.lowStockCount ?? 0}
          sub="Variants under 5 units"
          color="red"
          to="/admin/inventory"
        />
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs text-blue-600 hover:underline">
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
              {recentOrders.map(o => (
                <tr key={o._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link to={`/admin/orders/${o._id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      #{o._id.slice(-8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{o.userId?.name || "—"}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{fmt(o.total)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Link to="/admin/products/new"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          + New Product
        </Link>
        <Link to="/admin/orders"
          className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
          Manage Orders
        </Link>
        <Link to="/admin/inventory"
          className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
          View Inventory
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, to }) {
  const colors = {
    blue:   "text-blue-600 bg-blue-50",
    indigo: "text-indigo-600 bg-indigo-50",
    yellow: "text-yellow-700 bg-yellow-50",
    red:    "text-red-600 bg-red-50",
  };
  const card = (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
      <p className={`text-3xl font-bold mb-1 ${colors[color].split(" ")[0]}`}>{value}</p>
      <p className="text-sm font-semibold text-gray-800 mb-0.5">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}
