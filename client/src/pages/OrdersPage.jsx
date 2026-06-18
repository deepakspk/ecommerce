import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as ordersApi from "../api/orders";
import { getErrorMessage } from "../utils/errorHelpers";

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" });

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PACKED: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const PAYMENT_METHOD_LABELS = { COD: "Cash on Delivery", KHALTI: "Khalti", ESEWA: "eSewa" };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    ordersApi.getOrders()
      .then(d => setOrders(d.orders))
      .catch(e => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="mb-2">No orders yet.</p>
          <Link to="/products" className="text-blue-600 hover:underline text-sm">Start shopping →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Link key={order._id} to={`/orders/${order._id}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {order.status}
                    </span>
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
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
