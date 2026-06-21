import { useState, useEffect, useCallback } from "react";
import * as adminApi from "../../api/admin";
import { getErrorMessage } from "../../utils/errorHelpers";
import Badge from "../Badge";
import { CARD_CLASS } from "../../utils/ui";

const HAPPY_PATH = ["BOOKED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];
const STEP_LABELS = {
  BOOKED: "Booked",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};
const EXCEPTION_STATUSES = new Set(["RETURNED", "CANCELLED", "FAILED"]);

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-NP", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtMoney(n) {
  if (n === null || n === undefined || n === "") return "—";
  return `Rs. ${Number(n).toLocaleString()}`;
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className={`${CARD_CLASS} p-5`}>
      <h2 className="text-sm font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function NcmOrderInsights({ orderId }) {
  const [loading, setLoading] = useState(true);
  const [shipment, setShipment] = useState(null);
  const [provider, setProvider] = useState(null);

  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [comments, setComments] = useState(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState("");

  const loadComments = useCallback((shipmentId) => {
    setCommentsLoading(true);
    adminApi.getShipmentComments(shipmentId)
      .then(({ comments: list }) => setComments(list))
      .catch(() => setComments(null))
      .finally(() => setCommentsLoading(false));
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      adminApi.getShipment(orderId).catch(() => ({ shipment: null })),
      adminApi.listLogisticsProviders().catch(() => ({ providers: [] })),
    ]).then(([shipmentRes, providersRes]) => {
      if (ignore) return;
      const s = shipmentRes.shipment;
      setShipment(s);
      setProvider(providersRes.providers.find((p) => p.code === s?.provider) || null);
      setLoading(false);

      if (!s) return;

      setDetailsLoading(true);
      adminApi.getShipmentDetails(s._id)
        .then(setDetails)
        .catch(() => setDetails(null))
        .finally(() => setDetailsLoading(false));

      loadComments(s._id);

      setRefreshing(true);
      adminApi.refreshShipmentTracking(s._id)
        .then(({ shipment: updated }) => { if (!ignore) setShipment(updated); })
        .catch(() => { if (!ignore) setRefreshNote("Couldn't fetch the latest status from the carrier — showing last known status."); })
        .finally(() => { if (!ignore) setRefreshing(false); });
    });
    return () => { ignore = true; };
  }, [orderId, loadComments]);

  async function handleManualRefresh() {
    setRefreshing(true);
    setRefreshNote("");
    try {
      const { shipment: updated } = await adminApi.refreshShipmentTracking(shipment._id);
      setShipment(updated);
    } catch (e) {
      setRefreshNote(getErrorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommentError("");
    setPostingComment(true);
    try {
      const { comments: list } = await adminApi.addShipmentComment(shipment._id, newComment.trim());
      setComments(list);
      setNewComment("");
    } catch (e) {
      setCommentError(getErrorMessage(e));
    } finally {
      setPostingComment(false);
    }
  }

  if (loading || !shipment) return null;

  const label = details?.label;
  const summary = details?.summary;
  const isException = EXCEPTION_STATUSES.has(shipment.status);
  const currentStepIndex = HAPPY_PATH.indexOf(shipment.status);

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-xs font-bold tracking-widest uppercase text-gray-400 whitespace-nowrap">
          Logistics &amp; Shipment
        </h2>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="space-y-6">
        {/* NCM Shipment Information */}
        <Section title="NCM Shipment Information">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {provider?.label || shipment.provider} ·{" "}
              <span className="font-mono text-gray-800">{shipment.providerShipmentId}</span>
            </p>
            <Badge kind="shipment" status={shipment.status} />
          </div>

          {detailsLoading ? (
            <p className="text-xs text-gray-400">Loading shipment details…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              <Field label="Tracking / NCM Order ID" value={<span className="font-mono">{shipment.providerShipmentId}</span>} />
              <Field label="Reference ID" value={label?.description?.vendor_orderid} />
              <Field label="Delivery Type" value={label?.delivery_type} />
              <Field label="Payment Status" value={summary?.payment_status} />
              <Field label="COD Amount" value={fmtMoney(summary?.cod_charge ?? shipment.codCharge)} />
              <Field label="Delivery Charge" value={fmtMoney(summary?.delivery_charge ?? shipment.deliveryCharge)} />
              <Field
                label="Pickup Branch"
                value={label?.from_branch ? `${label.from_branch.name} (${label.from_branch.district})` : shipment.fromBranch}
              />
              <Field
                label="Destination Branch"
                value={label?.to_branch ? `${label.to_branch.name} (${label.to_branch.district})` : shipment.toBranch}
              />
              <Field label="Last Synced" value={fmtDate(shipment.lastSyncedAt)} />
            </div>
          )}

          {label && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5 pt-5 border-t border-gray-100">
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Sender</p>
                <p className="text-sm font-medium text-gray-800">{label.from?.name || "—"}</p>
                <p className="text-xs text-gray-500">{[label.from?.phone, label.from?.phone2].filter(Boolean).join(" / ")}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Receiver</p>
                <p className="text-sm font-medium text-gray-800">{label.receiver?.name || "—"}</p>
                <p className="text-xs text-gray-500">{[label.receiver?.phone, label.receiver?.phone2].filter(Boolean).join(" / ")}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label.receiver?.address}</p>
              </div>
              {(label.description?.description || label.description?.handling || label.description?.delivery_instruction) && (
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Package</p>
                  {label.description?.description && <p className="text-sm text-gray-700">{label.description.description}</p>}
                  {label.description?.handling && <p className="text-xs text-gray-500 mt-0.5">Handling: {label.description.handling}</p>}
                  {label.description?.delivery_instruction && (
                    <p className="text-xs text-gray-500 mt-0.5">Instruction: {label.description.delivery_instruction}</p>
                  )}
                </div>
              )}
            </div>
          )}
          {!detailsLoading && !label && details?.labelError && (
            <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">{details.labelError}</p>
          )}
        </Section>

        {/* Shipment Status Timeline */}
        <Section title="Shipment Status Timeline">
          {isException ? (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm font-semibold text-red-700">
                Shipment {shipment.status === "RETURNED" ? "Returned" : shipment.status === "CANCELLED" ? "Cancelled" : "Failed"}
              </p>
              <p className="text-xs text-red-500 mt-0.5">{shipment.rawStatus || "No further courier updates."}</p>
            </div>
          ) : (
            <div className="flex items-center gap-0">
              {HAPPY_PATH.map((step, i) => {
                const reached = currentStepIndex >= i;
                const current = currentStepIndex === i;
                return (
                  <div key={step} className="flex items-center flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      current ? "border-brand-600 bg-brand-600 text-white" :
                      reached ? "border-brand-400 bg-brand-50 text-brand-600" :
                      "border-gray-200 bg-white text-gray-300"
                    }`}>
                      {reached && !current ? "✓" : i + 1}
                    </div>
                    <div className="flex-1 px-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${reached ? "text-gray-700" : "text-gray-300"}`}>{STEP_LABELS[step]}</p>
                    </div>
                    {i < HAPPY_PATH.length - 1 && (
                      <div className={`w-4 h-0.5 flex-shrink-0 ${currentStepIndex > i ? "bg-brand-400" : "bg-gray-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {refreshNote && <p className="text-xs text-gray-400 mt-3">{refreshNote}</p>}
        </Section>

        {/* Tracking History + Order Comments side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Tracking History">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">{shipment.trackingEvents.length} event{shipment.trackingEvents.length !== 1 ? "s" : ""}</p>
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-50"
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            {shipment.trackingEvents.length === 0 ? (
              <p className="text-xs text-gray-400">No tracking events yet.</p>
            ) : (
              <ul className="space-y-3 border-l-2 border-gray-100 pl-4 max-h-80 overflow-y-auto">
                {shipment.trackingEvents.slice().reverse().map((event, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-400" />
                    <p className="text-sm font-medium text-gray-700">{event.rawStatus || event.status}</p>
                    <p className="text-xs text-gray-400">{fmtDate(event.occurredAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {provider?.capabilities.comments ? (
            <Section title="Order Comments">
              <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment for the carrier…"
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
                <button
                  type="submit"
                  disabled={postingComment || !newComment.trim()}
                  className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {postingComment ? "Posting…" : "Post"}
                </button>
              </form>
              {commentError && <p className="text-xs text-red-600 mb-3">{commentError}</p>}

              {commentsLoading ? (
                <p className="text-xs text-gray-400">Loading comments…</p>
              ) : !comments || comments.length === 0 ? (
                <p className="text-xs text-gray-400">No comments yet.</p>
              ) : (
                <ul className="space-y-3 max-h-64 overflow-y-auto">
                  {comments.map((c, i) => (
                    <li key={i} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-700">{c.addedBy || "Unknown"}</p>
                        <p className="text-xs text-gray-400">{fmtDate(c.added_time)}</p>
                      </div>
                      <p className="text-sm text-gray-600">{c.comments}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
