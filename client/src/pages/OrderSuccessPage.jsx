import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import * as ordersApi from "../api/orders";
import * as paymentsApi from "../api/payments";
import { getErrorMessage } from "../utils/errorHelpers";
import { submitEsewaForm } from "../utils/esewaForm";
import Badge from "../components/Badge";
import { H1_CLASS, CARD_CLASS } from "../utils/ui";

const PAYMENT_METHOD_LABELS = { COD: "Cash on Delivery", KHALTI: "Khalti", ESEWA: "eSewa" };

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;

const RETURN_STATUS_MESSAGES = {
  REQUESTED: "Your return request is awaiting review.",
  APPROVED: "Your return has been approved — pack the items for pickup.",
  REJECTED: "Your return request was rejected.",
  PICKED_UP: "Your returned items have been picked up.",
  REFUNDED: "Your refund has been processed.",
};

const ACTIVE_RETURN_STATUSES = ["REQUESTED", "APPROVED", "PICKED_UP"];

export default function OrderSuccessPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const [returnRequests, setReturnRequests] = useState([]);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnError, setReturnError] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  useEffect(() => {
    ordersApi.getOrder(id)
      .then(d => setOrder(d.order))
      .catch(e => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (order?.status === "DELIVERED") {
      ordersApi.getMyReturnRequests(id)
        .then(d => setReturnRequests(d.returnRequests))
        .catch(() => setReturnRequests([]));
    }
  }, [id, order?.status]);

  async function handleCancelOrder() {
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;
    setCancelling(true);
    setCancelError("");
    try {
      const { order: updated } = await ordersApi.cancelOrder(id);
      setOrder(updated);
    } catch (e) {
      setCancelError(getErrorMessage(e));
    } finally {
      setCancelling(false);
    }
  }

  function openReturnForm() {
    setReturnItems(order.items.map(item => ({
      variantId: item.variantId,
      productName: item.productName,
      size: item.size,
      color: item.color,
      maxQuantity: item.quantity,
      included: false,
      quantity: item.quantity,
      reason: "",
    })));
    setReturnError("");
    setShowReturnForm(true);
  }

  function updateReturnItem(index, patch) {
    setReturnItems(items => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  async function handleSubmitReturn(e) {
    e.preventDefault();
    const selected = returnItems.filter(it => it.included);
    if (selected.length === 0) {
      setReturnError("Select at least one item to return");
      return;
    }
    if (selected.some(it => !it.reason.trim())) {
      setReturnError("Give a reason for each selected item");
      return;
    }

    setSubmittingReturn(true);
    setReturnError("");
    try {
      const { returnRequest } = await ordersApi.requestReturn(
        id,
        selected.map(it => ({ variantId: it.variantId, quantity: Number(it.quantity), reason: it.reason.trim() }))
      );
      setReturnRequests(prev => [returnRequest, ...prev]);
      setShowReturnForm(false);
    } catch (e) {
      setReturnError(getErrorMessage(e));
    } finally {
      setSubmittingReturn(false);
    }
  }

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
        <Link to="/orders" className="text-brand-600 hover:underline text-sm">View all orders</Link>
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
        <h1 className={H1_CLASS}>Order Placed!</h1>
        <p className="text-gray-500 text-sm mt-1">Thank you for your order. You'll receive your items soon.</p>
      </div>

      <div className={`${CARD_CLASS} overflow-hidden`}>
        {/* Order meta */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Order ID</p>
            <p className="text-sm font-mono font-medium text-gray-700">{order._id}</p>
          </div>
          <Badge kind="order" status={order.status} />
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
              className="w-full py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
            >
              {retrying ? "Redirecting…" : `Pay with ${PAYMENT_METHOD_LABELS[order.paymentMethod]}`}
            </button>
          </div>
        )}

        {/* Cancel order */}
        {["PENDING", "CONFIRMED"].includes(order.status) && (
          <div className="px-5 py-4 border-b border-gray-100">
            {cancelError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{cancelError}</p>
            )}
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="w-full py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel order"}
            </button>
          </div>
        )}

        {/* Returns */}
        {order.status === "DELIVERED" && (
          <div className="px-5 py-4 border-b border-gray-100">
            {returnRequests.length > 0 && (
              <div className="space-y-2 mb-3">
                {returnRequests.map(rr => (
                  <div key={rr._id} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <Badge kind="return" status={rr.status} />
                      <span className="text-xs text-gray-400">
                        {new Date(rr.createdAt).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{RETURN_STATUS_MESSAGES[rr.status]}</p>
                    {rr.adminNote && <p className="text-xs text-gray-400 mt-1">Note: {rr.adminNote}</p>}
                  </div>
                ))}
              </div>
            )}

            {!showReturnForm ? (
              !ACTIVE_RETURN_STATUSES.includes(returnRequests[0]?.status) && (
                <button
                  onClick={openReturnForm}
                  className="w-full py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Request return
                </button>
              )
            ) : (
              <form onSubmit={handleSubmitReturn} className="space-y-3">
                <p className="text-xs text-gray-500">Select the items you want to return and tell us why.</p>
                {returnItems.map((item, i) => (
                  <div key={i} className={`border rounded-lg p-3 ${item.included ? "border-brand-300 bg-brand-50/30" : "border-gray-200"}`}>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={item.included}
                        onChange={(e) => updateReturnItem(i, { included: e.target.checked })}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500">{item.size} · {item.color} (ordered × {item.maxQuantity})</p>
                      </div>
                    </label>
                    {item.included && (
                      <div className="mt-2 pl-6 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Qty</label>
                          <input
                            type="number"
                            min={1}
                            max={item.maxQuantity}
                            value={item.quantity}
                            onChange={(e) => updateReturnItem(i, { quantity: e.target.value })}
                            className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Reason for return"
                          value={item.reason}
                          onChange={(e) => updateReturnItem(i, { reason: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}

                {returnError && <p className="text-sm text-red-600">{returnError}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReturnForm(false)}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReturn}
                    className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black disabled:opacity-50"
                  >
                    {submittingReturn ? "Submitting…" : "Submit return request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 flex gap-3">
          <Link to="/orders"
            className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            View all orders
          </Link>
          <Link to="/products"
            className="flex-1 text-center py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
