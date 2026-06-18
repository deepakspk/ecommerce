import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import * as ordersApi from "../api/orders";
import * as paymentsApi from "../api/payments";
import { getErrorMessage } from "../utils/errorHelpers";
import { submitEsewaForm } from "../utils/esewaForm";

const PAYMENT_METHOD_LABELS = { COD: "Cash on Delivery", KHALTI: "Khalti", ESEWA: "eSewa" };

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PACKED: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function OrderSuccessPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    ordersApi.getOrder(id)
      .then(d => setOrder(d.order))
      .catch(e => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleRetryPayment() {
    setRetrying(true);
    try {
      if (order.paymentMethod === "ESEWA") {
        const { formUrl, fields } = await paymentsApi.initiateEsewa(order._id);
        submitEsewaForm({ formUrl, fields });
        return;
      }
      const { paymentUrl } = await paymentsApi.initiateKhalti(order._id);
      window.location.href = paymentUrl;
    } catch (e) {
      setError(getErrorMessage(e));
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-red-600 mb-4">{error || "Order not found."}</p>
        <Link to="/orders" className="text-blue-600 hover:underline text-sm">View all orders</Link>
      </div>
    );
  }

  const a = order.address;
  const addrLine = [a.area, a.street, a.city, a.district, a.province].filter(Boolean).join(", ");

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Order Placed!</h1>
        <p className="text-gray-500 text-sm mt-1">Thank you for your order. You'll receive your items soon.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Order meta */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Order ID</p>
            <p className="text-sm font-mono font-medium text-gray-700">{order._id}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
            {order.status}
          </span>
        </div>

        {/* Items */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div>
                <p className="font-medium text-gray-900">{item.productName}</p>
                <p className="text-xs text-gray-500">{item.size} · {item.color} × {item.quantity}</p>
              </div>
              <p className="font-medium text-gray-800">{fmt(item.unitPrice * item.quantity)}</p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Delivery fee</span><span>{fmt(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 text-base pt-1 border-t border-gray-100">
            <span>Total</span><span>{fmt(order.total)}</span>
          </div>
        </div>

        {/* Payment + delivery */}
        <div className="px-5 py-4 border-b border-gray-100 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Payment</p>
            <p className="font-medium text-gray-800">{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
            <p className="text-xs text-gray-500">{order.paymentStatus}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Deliver to</p>
            <p className="font-medium text-gray-800">{a.recipientName}</p>
            <p className="text-xs text-gray-500">{a.phone}</p>
            <p className="text-xs text-gray-500 mt-0.5">{addrLine}</p>
            {a.landmark && <p className="text-xs text-gray-400">Near: {a.landmark}</p>}
          </div>
        </div>

        {["KHALTI", "ESEWA"].includes(order.paymentMethod) && ["PENDING", "FAILED"].includes(order.paymentStatus) && (
          <div className="px-5 py-4 border-b border-gray-100">
            {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{error}</p>}
            <button
              onClick={handleRetryPayment}
              disabled={retrying}
              className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {retrying ? "Redirecting…" : `Pay with ${PAYMENT_METHOD_LABELS[order.paymentMethod]}`}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 flex gap-3">
          <Link to="/orders"
            className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            View all orders
          </Link>
          <Link to="/products"
            className="flex-1 text-center py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
