import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as adminApi from "../../api/admin";
import Badge from "../../components/Badge";
import Pagination from "../../components/Pagination";
import EmptyState from "../../components/EmptyState";
import ShipmentQuickCreate from "../../components/admin/ShipmentQuickCreate";
import { H1_CLASS, CARD_CLASS } from "../../utils/ui";

const SHIPPABLE_STATUSES = new Set(["PENDING", "CONFIRMED", "PACKED"]);

const fmt = n => `Rs. ${Number(n).toLocaleString()}`;

const ALL_STATUSES = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NP", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [logisticsProviders, setLogisticsProviders] = useState([]);

  async function load(p = 1) {
    setLoading(true);
    try {
      const params = { page: p, limit: 25 };
      if (statusFilter) params.status = statusFilter;
      const data = await adminApi.listAdminOrders(params);
      setOrders(data.orders);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, [statusFilter]);

  useEffect(() => {
    adminApi.listLogisticsProviders()
      .then(({ providers }) => setLogisticsProviders(providers))
      .catch(() => setLogisticsProviders([]));
  }, []);

  function handleShipmentCreated(orderId) {
    setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, hasShipment: true } : o)));
  }

  function setFilter(status) {
    if (status) setSearchParams({ status });
    else setSearchParams({});
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={H1_CLASS}>Orders</h1>
          {!loading && <p className="text-sm text-gray-400 mt-0.5">{total} order{total !== 1 ? "s" : ""}</p>}
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-5 flex-wrap">
        <FilterTab label="All" active={!statusFilter} onClick={() => setFilter("")} />
        {ALL_STATUSES.map(s => (
          <FilterTab key={s} label={s} active={statusFilter === s} onClick={() => setFilter(s)} />
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : orders.length === 0 ? (
        <EmptyState title={`No orders${statusFilter ? ` with status "${statusFilter}"` : ""}.`} />
      ) : (
        <>
          <div className={`${CARD_CLASS} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Shipment</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(o => (
                  <tr key={o._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-gray-600">#{o._id.slice(-8).toUpperCase()}</span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{o.userId?.name || "—"}</p>
                      <p className="text-xs text-gray-400">{o.userId?.email}</p>
                      {o.userId?.phone && <p className="text-xs text-gray-400">{o.userId.phone}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                    <td className="px-5 py-3 text-gray-600">{o.items.length}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{fmt(o.total)}</td>
                    <td className="px-5 py-3">
                      <Badge kind="order" status={o.status} />
                    </td>
                    <td className="px-5 py-3">
                      <Badge kind="payment" status={o.paymentStatus} />
                    </td>
                    <td className="px-5 py-3">
                      {o.hasShipment ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Created
                        </span>
                      ) : SHIPPABLE_STATUSES.has(o.status) ? (
                        <ShipmentQuickCreate order={o} providers={logisticsProviders} onCreated={handleShipmentCreated} />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/admin/orders/${o._id}`} className="text-brand-600 hover:underline text-xs font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

          <Pagination page={page} pages={pages} onChange={load} />
        </>
      )}
    </div>
  );
}

function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        active ? "bg-gray-900 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
