import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import ShipmentPanel from "../../components/ShipmentPanel";

const fmt = n => `Rs. ${Number(n).toLocaleString()}`;

const STATUS_TRANSITIONS = {
  PENDING:   ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED",    "CANCELLED"],
  PACKED:    ["SHIPPED",   "CANCELLED"],
  SHIPPED:   ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_COLORS = {
  PENDING:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
  PACKED:    "bg-purple-100 text-purple-700 border-purple-200",
  SHIPPED:   "bg-indigo-100 text-indigo-700 border-indigo-200",
  DELIVERED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-red-100 text-red-600 border-red-200",
};

const STATUS_ORDER = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];

function fmtDate(d) {
  return new Date(d).toLocaleString("en-NP", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    adminApi.getAdminOrder(id)
      .then(d => setOrder(d.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(newStatus) {
    setStatusError("");
    setUpdating(true);
    try {
      const { order: updated } = await adminApi.updateOrderStatus(id, newStatus);
      setOrder(updated);
    } catch (e) {
      setStatusError(e.response?.data?.message || "Error updating status");
    } finally {
      setUpdating(false);
    }
  }

  async function handleMarkPaid() {
    setMarkingPaid(true);
    try {
      const { order: updated } = await adminApi.markOrderPaid(id);
      setOrder(updated);
    } catch (e) {
      setStatusError(e.response?.data?.message || "Error marking as paid");
    } finally {
      setMarkingPaid(false);
    }
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;
  if (!order) return (
    <div className="p-8">
      <p className="text-red-600 mb-3">Order not found.</p>
      <Link to="/admin/orders" className="text-blue-600 hover:underline text-sm">← Back to orders</Link>
    </div>
  );

  const nextStatuses = STATUS_TRANSITIONS[order.status] ?? [];
  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";
  const canMarkPaid = order.paymentMethod === "COD" && order.paymentStatus !== "PAID";

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/admin/orders" className="text-gray-400 hover:text-gray-700 text-sm">← Orders</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Order <span className="font-mono text-gray-500">#{order._id.slice(-8).toUpperCase()}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{fmtDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
            {order.status}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            order.paymentStatus === "PAID" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}>
            {order.paymentStatus}
          </span>
        </div>
      </div>

      {/* Status timeline */}
      {!isCancelled && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <div className="flex items-center gap-0">
            {STATUS_ORDER.map((s, i) => {
              const reached = STATUS_ORDER.indexOf(order.status) >= i;
              const current = order.status === s;
              return (
                <div key={s} className="flex items-center flex-1 min-w-0">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    current ? "border-blue-600 bg-blue-600 text-white" :
                    reached ? "border-blue-400 bg-blue-50 text-blue-600" :
                    "border-gray-200 bg-white text-gray-300"
                  }`}>
                    {reached && !current ? "✓" : i + 1}
                  </div>
                  <div className="flex-1 px-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${reached ? "text-gray-700" : "text-gray-300"}`}>{s}</p>
                  </div>
                  {i < STATUS_ORDER.length - 1 && (
                    <div className={`w-4 h-0.5 flex-shrink-0 ${
                      STATUS_ORDER.indexOf(order.status) > i ? "bg-blue-400" : "bg-gray-200"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Left */}
        <div className="space-y-5">
          {/* Items */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Items ({order.items.length})</h2>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, i) => (
                  <tr key={i} className="px-5">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.size} · {item.color}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs text-center">× {item.quantity}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-800">
                      {fmt(item.unitPrice * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-100 px-5 py-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span><span>{fmt(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2 mt-1">
                <span>Total</span><span>{fmt(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Delivery address */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Delivery Address</h2>
            <p className="text-sm font-semibold text-gray-900">{order.address.recipientName}</p>
            <p className="text-sm text-gray-600">{order.address.phone}</p>
            <p className="text-sm text-gray-500 mt-1">
              {[order.address.area, order.address.street, order.address.city,
                order.address.district, order.address.province].filter(Boolean).join(", ")}
            </p>
            {order.address.landmark && (
              <p className="text-xs text-gray-400 mt-0.5">Near: {order.address.landmark}</p>
            )}
          </div>

          {/* Customer */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Customer</h2>
            <p className="text-sm font-medium text-gray-900">{order.userId?.name || "—"}</p>
            <p className="text-sm text-gray-500">{order.userId?.email}</p>
            {order.userId?.phone && <p className="text-sm text-gray-500">{order.userId.phone}</p>}
          </div>
        </div>

        {/* Right — actions */}
        <div className="space-y-5">
          {/* Status update */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Update Status</h2>

            {isCancelled || isDelivered ? (
              <p className="text-xs text-gray-400">
                {isCancelled ? "This order was cancelled." : "This order has been delivered."}
              </p>
            ) : nextStatuses.length === 0 ? (
              <p className="text-xs text-gray-400">No further status changes available.</p>
            ) : (
              <div className="space-y-2">
                {nextStatuses.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={updating}
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                      s === "CANCELLED"
                        ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {updating ? "Updating…" : `Mark as ${s}`}
                  </button>
                ))}
              </div>
            )}

            {statusError && (
              <p className="text-xs text-red-600 mt-2">{statusError}</p>
            )}
          </div>

          {/* Shipment */}
          <ShipmentPanel orderId={order._id} order={order} />

          {/* Mark as paid */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Payment</h2>
            <p className="text-xs text-gray-500 mb-3">
              Method: <span className="font-medium text-gray-700">{order.paymentMethod}</span>
            </p>

            {order.paymentStatus === "PAID" ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <span className="text-base">✓</span>
                <span className="text-sm font-medium">Payment collected</span>
              </div>
            ) : canMarkPaid ? (
              <button
                onClick={handleMarkPaid}
                disabled={markingPaid}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {markingPaid ? "Saving…" : "Mark COD as Paid"}
              </button>
            ) : (
              <p className="text-xs text-gray-400">
                {order.paymentMethod !== "COD" ? "Online payment — status managed externally." : "Already paid."}
              </p>
            )}
          </div>

          {/* Order meta */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-400 space-y-1">
            <p>Order ID: <span className="font-mono text-gray-600">{order._id}</span></p>
            <p>Placed: {fmtDate(order.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
