import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import * as adminApi from "../../api/admin";

const fmt = n => `Rs. ${Number(n).toLocaleString()}`;

const STATUS_TRANSITIONS = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PICKED_UP"],
  PICKED_UP: ["REFUNDED"],
  REJECTED: [],
  REFUNDED: [],
};

const STATUS_COLORS = {
  REQUESTED: "bg-yellow-100 text-yellow-700 border-yellow-200",
  APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
  REJECTED: "bg-red-100 text-red-600 border-red-200",
  PICKED_UP: "bg-indigo-100 text-indigo-700 border-indigo-200",
  REFUNDED: "bg-green-100 text-green-700 border-green-200",
};

const ACTION_LABELS = {
  APPROVED: "Approve return",
  REJECTED: "Reject return",
  PICKED_UP: "Mark as picked up",
  REFUNDED: "Mark as refunded",
};

function fmtDate(d) {
  return new Date(d).toLocaleString("en-NP", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminReturnDetailPage() {
  const { id } = useParams();
  const [returnRequest, setReturnRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState("");
  const [statusError, setStatusError] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    adminApi.getAdminReturn(id)
      .then(d => {
        setReturnRequest(d.returnRequest);
        setAdminNote(d.returnRequest.adminNote || "");
      })
      .catch(() => setReturnRequest(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(newStatus) {
    setStatusError("");
    setUpdating(true);
    try {
      const { returnRequest: updated } = await adminApi.updateReturnStatus(id, { status: newStatus, adminNote });
      setReturnRequest(updated);
    } catch (e) {
      setStatusError(e.response?.data?.message || "Error updating status");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;
  if (!returnRequest) return (
    <div className="p-8">
      <p className="text-red-600 mb-3">Return request not found.</p>
      <Link to="/admin/returns" className="text-blue-600 hover:underline text-sm">← Back to returns</Link>
    </div>
  );

  const order = returnRequest.orderId;
  const orderItemMap = new Map((order?.items || []).map(i => [String(i.variantId), i]));
  const nextStatuses = STATUS_TRANSITIONS[returnRequest.status] ?? [];

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/admin/returns" className="text-gray-400 hover:text-gray-700 text-sm">← Returns</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Return for order{" "}
            {order?._id ? (
              <Link to={`/admin/orders/${order._id}`} className="font-mono text-blue-600 hover:underline">
                #{order._id.slice(-8).toUpperCase()}
              </Link>
            ) : (
              <span className="font-mono text-gray-500">—</span>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Requested {fmtDate(returnRequest.createdAt)}</p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${STATUS_COLORS[returnRequest.status]}`}>
          {returnRequest.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-5">
          {/* Items */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Items to return ({returnRequest.items.length})</h2>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {returnRequest.items.map((item, i) => {
                  const orderItem = orderItemMap.get(String(item.variantId));
                  return (
                    <tr key={i}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{orderItem?.productName || "—"}</p>
                        {orderItem && <p className="text-xs text-gray-400 mt-0.5">{orderItem.size} · {orderItem.color}</p>}
                        <p className="text-xs text-gray-500 mt-1">Reason: {item.reason}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs text-center">× {item.quantity}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-800">
                        {orderItem ? fmt(orderItem.unitPrice * item.quantity) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Customer */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Customer</h2>
            <p className="text-sm font-medium text-gray-900">{returnRequest.userId?.name || "—"}</p>
            <p className="text-sm text-gray-500">{returnRequest.userId?.email}</p>
            {returnRequest.userId?.phone && <p className="text-sm text-gray-500">{returnRequest.userId.phone}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Admin note</h2>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Optional note for this return"
              className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Update Status</h2>

            {nextStatuses.length === 0 ? (
              <p className="text-xs text-gray-400">No further actions available.</p>
            ) : (
              <div className="space-y-2">
                {nextStatuses.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={updating}
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                      s === "REJECTED"
                        ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {updating ? "Updating…" : ACTION_LABELS[s]}
                  </button>
                ))}
              </div>
            )}

            {statusError && <p className="text-xs text-red-600 mt-2">{statusError}</p>}

            {returnRequest.status === "REFUNDED" && (
              <p className="text-xs text-gray-400 mt-3">
                Refund logged on the order. The actual gateway/COD refund still needs to be issued manually via
                the Khalti/eSewa merchant dashboard or cash handover.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
