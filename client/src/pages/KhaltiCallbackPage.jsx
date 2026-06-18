import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import * as paymentsApi from "../api/payments";
import { getErrorMessage } from "../utils/errorHelpers";

export default function KhaltiCallbackPage() {
  const [searchParams] = useSearchParams();
  const pidx = searchParams.get("pidx");

  const [status, setStatus] = useState("checking");
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pidx) return;
    paymentsApi.verifyKhalti(pidx)
      .then(({ order }) => {
        setOrderId(order._id);
        setStatus(order.paymentStatus === "PAID" ? "success" : "failed");
      })
      .catch((e) => {
        setStatus("error");
        setError(getErrorMessage(e));
      });
  }, [pidx]);

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      {!pidx && (
        <>
          <h1 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h1>
          <p className="text-gray-500 text-sm mb-6">Missing payment reference.</p>
          <Link to="/orders" className="text-blue-600 hover:underline text-sm font-medium">
            View all orders →
          </Link>
        </>
      )}

      {pidx && status === "checking" && (
        <>
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Confirming your payment with Khalti…</p>
        </>
      )}

      {status === "success" && (
        <>
          <h1 className="text-xl font-bold text-green-700 mb-2">Payment successful</h1>
          <p className="text-gray-500 text-sm mb-6">Your order has been paid via Khalti.</p>
          <Link to={`/orders/${orderId}`} className="text-blue-600 hover:underline text-sm font-medium">
            View order →
          </Link>
        </>
      )}

      {status === "failed" && (
        <>
          <h1 className="text-xl font-bold text-red-700 mb-2">Payment not completed</h1>
          <p className="text-gray-500 text-sm mb-6">The payment was cancelled, expired, or failed.</p>
          <Link to={`/orders/${orderId}`} className="text-blue-600 hover:underline text-sm font-medium">
            View order →
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h1>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <Link to="/orders" className="text-blue-600 hover:underline text-sm font-medium">
            View all orders →
          </Link>
        </>
      )}
    </div>
  );
}
