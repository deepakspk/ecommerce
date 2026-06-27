import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as adminApi from "../../api/admin";
import Badge from "../../components/Badge";
import Pagination from "../../components/Pagination";
import EmptyState from "../../components/EmptyState";
import ShipmentQuickCreate from "../../components/admin/ShipmentQuickCreate";
import ClearFiltersButton from "../../components/admin/ClearFiltersButton";
import TableSkeleton from "../../components/admin/TableSkeleton";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { CARD_CLASS, INPUT_CLASS, FILTER_BAR_CLASS, FILTER_FIELD_CLASS } from "../../utils/ui";
import { downloadBlob } from "../../utils/downloadBlob";

const SHIPPABLE_STATUSES = new Set(["PENDING", "CONFIRMED", "PACKED"]);

const fmt = n => `Rs. ${Number(n).toLocaleString()}`;

const ALL_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "PICKED",
  "SHIPPED",
  "ARRIVED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NP", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [logisticsProviders, setLogisticsProviders] = useState([]);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async (p = 1, { silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = { page: p, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      if (paymentStatus) params.paymentStatus = paymentStatus;
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (from) params.from = from;
      if (to) params.to = to;
      const data = await adminApi.listAdminOrders(params);
      setOrders(data.orders);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, search, paymentStatus, paymentMethod, from, to]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    const interval = setInterval(() => load(page, { silent: true }), 20000);
    return () => clearInterval(interval);
  }, [load, page]);

  useEffect(() => {
    adminApi.listLogisticsProviders()
      .then(({ providers }) => setLogisticsProviders(providers))
      .catch(() => setLogisticsProviders([]));
  }, []);

  function handleShipmentCreated(orderId, shipment) {
    setOrders((prev) =>
      prev.map((o) => (o._id === orderId ? { ...o, hasShipment: true, shipmentProvider: shipment?.provider || null } : o))
    );
  }

  function providerLabel(code) {
    return logisticsProviders.find((p) => p.code === code)?.label || code;
  }

  async function handleDownloadInvoice(orderId) {
    setDownloadingInvoiceId(orderId);
    try {
      const blob = await adminApi.downloadOrderInvoice(orderId);
      downloadBlob(blob, `invoice-${orderId}.pdf`);
    } catch {
      // ignored — admin can retry from the order detail page
    } finally {
      setDownloadingInvoiceId(null);
    }
  }

  function setFilter(status) {
    if (status) setSearchParams({ status });
    else setSearchParams({});
  }

  const hasFilters = search || paymentStatus || paymentMethod || from || to || statusFilter;

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setPaymentStatus("");
    setPaymentMethod("");
    setFrom("");
    setTo("");
    setFilter("");
  }

  return (
    <div className="p-4 sm:p-8">
      <AdminPageHeader
        title="Orders"
        loading={loading}
        subtitle={`${total} order${total !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => navigate("/admin/orders/new")}
            className="bg-white text-brand-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-50 transition-colors shadow-sm"
          >
            + New Order
          </button>
        }
      />

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-5 flex-wrap">
        <FilterTab label="All" active={!statusFilter} onClick={() => setFilter("")} />
        {ALL_STATUSES.map(s => (
          <FilterTab key={s} label={s} active={statusFilter === s} onClick={() => setFilter(s)} />
        ))}
      </div>

      <div className={FILTER_BAR_CLASS}>
        <div className={FILTER_FIELD_CLASS}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by customer name, email, or phone"
            className={INPUT_CLASS}
          />
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={INPUT_CLASS}>
            <option value="">All payment statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={INPUT_CLASS}>
            <option value="">All payment methods</option>
            <option value="COD">Cash on Delivery</option>
            <option value="ESEWA">eSewa</option>
            <option value="KHALTI">Khalti</option>
          </select>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2 text-xs text-gray-500">
          Date
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${INPUT_CLASS} w-36`} />
          <span>–</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${INPUT_CLASS} w-36`} />
        </div>
        <ClearFiltersButton show={hasFilters} onClick={clearFilters} />
      </div>

      {loading ? (
        <TableSkeleton columns={9} />
      ) : orders.length === 0 ? (
        <EmptyState title={hasFilters || statusFilter ? "No orders match these filters." : "No orders."} />
      ) : (
        <>
          <div className={`${CARD_CLASS} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/60 dark:border-gray-700">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Order ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Items</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Payment</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Shipment</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {orders.map(o => (
                  <tr
                    key={o._id}
                    onClick={() => navigate(`/admin/orders/${o._id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-400">#{o._id.slice(-8).toUpperCase()}</span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{o.userId?.name || "—"}</p>
                      <p className="text-xs text-gray-400">{o.userId?.email}</p>
                      {o.userId?.phone && <p className="text-xs text-gray-400">{o.userId.phone}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{o.items.length}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900 dark:text-gray-100">{fmt(o.total)}</td>
                    <td className="px-5 py-3">
                      <Badge kind="order" status={o.status} />
                    </td>
                    <td className="px-5 py-3">
                      <Badge kind="payment" status={o.paymentStatus} />
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      {o.hasShipment ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Created
                          </span>
                          {o.shipmentProvider && (
                            <p className="text-xs text-gray-400 mt-0.5">{providerLabel(o.shipmentProvider)}</p>
                          )}
                        </div>
                      ) : SHIPPABLE_STATUSES.has(o.status) ? (
                        <ShipmentQuickCreate order={o} providers={logisticsProviders} onCreated={handleShipmentCreated} />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          title="View order"
                          onClick={() => navigate(`/admin/orders/${o._id}`)}
                        >
                          <EyeIcon />
                        </IconButton>
                        <IconButton
                          title="Edit order"
                          onClick={() => navigate(`/admin/orders/${o._id}?edit=1`)}
                        >
                          <PencilIcon />
                        </IconButton>
                        <IconButton
                          title="Download invoice"
                          disabled={downloadingInvoiceId === o._id}
                          onClick={() => handleDownloadInvoice(o._id)}
                        >
                          <InvoiceIcon />
                        </IconButton>
                      </div>
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

function IconButton({ title, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-md text-gray-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
    >
      {children}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5V18a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 18V6.75A2.25 2.25 0 0 1 6.75 4.5h4.5" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
    </svg>
  );
}

function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? "bg-gray-900 text-white dark:bg-brand-600"
          : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      }`}
    >
      {label}
    </button>
  );
}
