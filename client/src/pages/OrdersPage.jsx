import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as ordersApi from "../api/orders";
import { getErrorMessage } from "../utils/errorHelpers";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import { H1_CLASS, CARD_CLASS } from "../utils/ui";

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" });

const PAYMENT_METHOD_LABELS = { COD: "Cash on Delivery", KHALTI: "Khalti", ESEWA: "eSewa" };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    ordersApi.getOrders()
      .then(d => setOrders(d.orders))
      .catch(e => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  async function handleCancel(e, orderId) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;
    setCancellingId(orderId);
    setError("");
    try {
      const { order: updated } = await ordersApi.cancelOrder(orderId);
      setOrders(prev => prev.map(o => (o._id === orderId ? updated : o)));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className={`${H1_CLASS} mb-6`}>My Orders</h1>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>
      )}

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet."
          action={<Link to="/products" className="text-brand-600 hover:underline text-sm">Start shopping →</Link>}
        />
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Link key={order._id} to={`/orders/${order._id}`}
              className={`block ${CARD_CLASS} p-5 hover:border-brand-300 hover:shadow-sm transition-all`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge kind="order" status={order.status} />
                    <span className="text-xs text-gray-400">{fmtDate(order.createdAt)}</span>
                  </div>
                  <p className="text-sm font-mono text-gray-400 truncate">{order._id}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    {" — "}
                    {order.items.map(i => i.productName).join(", ").substring(0, 60)}
                    {order.items.map(i => i.productName).join(", ").length > 60 ? "…" : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-semibold text-gray-900">{fmt(order.total)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                  </p>
                  {["PENDING", "CONFIRMED"].includes(order.status) && (
                    <button
                      onClick={(e) => handleCancel(e, order._id)}
                      disabled={cancellingId === order._id}
                      className="mt-2 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      {cancellingId === order._id ? "Cancelling…" : "Cancel order"}
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
