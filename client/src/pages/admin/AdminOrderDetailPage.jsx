import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import ShipmentPanel from "../../components/ShipmentPanel";
import Badge from "../../components/Badge";
import { H1_CLASS } from "../../utils/ui";
import { downloadBlob } from "../../utils/downloadBlob";

const fmt = n => `Rs. ${Number(n).toLocaleString()}`;

const STATUS_TRANSITIONS = {
  PENDING:   ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED",    "CANCELLED"],
  PACKED:    ["SHIPPED",   "CANCELLED"],
  SHIPPED:   ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_ORDER = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];

function fmtDate(d) {
  return new Date(d).toLocaleString("en-NP", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const emptyItem = () => ({
  variantId: "", productName: "", size: "", color: "", unitPrice: 0, quantity: 1,
});

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editItems, setEditItems] = useState([]);
  const [editAddress, setEditAddress] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);

  useEffect(() => {
    adminApi.getAdminOrder(id)
      .then(d => setOrder(d.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  function startEditing() {
    setSaveError("");
    setEditItems(order.items.map(i => ({ ...i })));
    setEditAddress({ ...order.address });
    setEditCustomer({
      name: order.userId?.name || "",
      email: order.userId?.email || "",
      phone: order.userId?.phone || "",
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setSaveError("");
  }

  function updateEditItem(index, field, value) {
    setEditItems(items => items.map((it, i) => i === index ? { ...it, [field]: value } : it));
  }

  function removeEditItem(index) {
    setEditItems(items => items.filter((_, i) => i !== index));
  }

  function addEditItem() {
    setEditItems(items => [...items, emptyItem()]);
  }

  async function handleSave() {
    setSaveError("");

    if (editItems.length === 0) {
      setSaveError("Order must have at least one item.");
      return;
    }
    for (const it of editItems) {
      if (!it.variantId.trim() || !it.productName.trim() || !it.size.trim() || !it.color.trim()) {
        setSaveError("Every item needs variant ID, product name, size, and color.");
        return;
      }
      if (!(Number(it.unitPrice) >= 0) || !(Number(it.quantity) >= 1)) {
        setSaveError("Item prices must be ≥ 0 and quantities must be at least 1.");
        return;
      }
    }
    if (!editAddress.recipientName.trim() || !editAddress.phone.trim() ||
        !editAddress.province.trim() || !editAddress.district.trim() || !editAddress.city.trim()) {
      setSaveError("Recipient name, phone, province, district, and city are required.");
      return;
    }
    if (!editCustomer.name.trim() || !editCustomer.phone.trim()) {
      setSaveError("Customer name and phone are required.");
      return;
    }

    setSaving(true);
    try {
      const { order: updated } = await adminApi.updateOrder(id, {
        items: editItems.map(it => ({
          ...it,
          unitPrice: Number(it.unitPrice),
          quantity: Number(it.quantity),
        })),
        address: editAddress,
        customer: editCustomer,
      });
      setOrder(updated);
      setEditing(false);
    } catch (e) {
      setSaveError(e.response?.data?.message || "Error saving order");
    } finally {
      setSaving(false);
    }
  }

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

  async function handleDownloadInvoice() {
    setDownloadingInvoice(true);
    try {
      const blob = await adminApi.downloadOrderInvoice(id);
      downloadBlob(blob, `invoice-${id}.pdf`);
    } catch (e) {
      setStatusError(e.response?.data?.message || "Error downloading invoice");
    } finally {
      setDownloadingInvoice(false);
    }
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;
  if (!order) return (
    <div className="p-8">
      <p className="text-red-600 mb-3">Order not found.</p>
      <Link to="/admin/orders" className="text-brand-600 hover:underline text-sm">← Back to orders</Link>
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
          <h1 className={`${H1_CLASS} mt-1`}>
            Order <span className="font-mono text-gray-500">#{order._id.slice(-8).toUpperCase()}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{fmtDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge kind="order" status={order.status} />
          <Badge kind="payment" status={order.paymentStatus} />
          <button
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {downloadingInvoice ? "Downloading…" : "Invoice"}
          </button>
          {!editing && !isCancelled && !isDelivered && (
            <button
              onClick={startEditing}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Edit Order
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg px-5 py-3 mb-5 flex items-center justify-between">
          <p className="text-sm text-brand-700 font-medium">Editing order — items, delivery address, and customer details</p>
          <div className="flex items-center gap-2">
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            <button
              onClick={cancelEditing}
              disabled={saving}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Status timeline */}
      {!isCancelled && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5">
          <div className="flex items-center gap-0">
            {STATUS_ORDER.map((s, i) => {
              const reached = STATUS_ORDER.indexOf(order.status) >= i;
              const current = order.status === s;
              return (
                <div key={s} className="flex items-center flex-1 min-w-0">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    current ? "border-brand-600 bg-brand-600 text-white" :
                    reached ? "border-brand-400 bg-brand-50 text-brand-600" :
                    "border-gray-200 bg-white text-gray-300"
                  }`}>
                    {reached && !current ? "✓" : i + 1}
                  </div>
                  <div className="flex-1 px-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${reached ? "text-gray-700" : "text-gray-300"}`}>{s}</p>
                  </div>
                  {i < STATUS_ORDER.length - 1 && (
                    <div className={`w-4 h-0.5 flex-shrink-0 ${
                      STATUS_ORDER.indexOf(order.status) > i ? "bg-brand-400" : "bg-gray-200"
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
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">
                Items ({editing ? editItems.length : order.items.length})
              </h2>
              {editing && (
                <button
                  onClick={addEditItem}
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  + Add item
                </button>
              )}
            </div>

            {editing ? (
              <div className="divide-y divide-gray-100">
                {editItems.map((item, i) => (
                  <div key={i} className="px-5 py-3 grid grid-cols-12 gap-2 items-center">
                    <input
                      className="col-span-4 border border-gray-200 rounded px-2 py-1 text-xs"
                      placeholder="Product name"
                      value={item.productName}
                      onChange={e => updateEditItem(i, "productName", e.target.value)}
                    />
                    <input
                      className="col-span-2 border border-gray-200 rounded px-2 py-1 text-xs"
                      placeholder="Size"
                      value={item.size}
                      onChange={e => updateEditItem(i, "size", e.target.value)}
                    />
                    <input
                      className="col-span-2 border border-gray-200 rounded px-2 py-1 text-xs"
                      placeholder="Color"
                      value={item.color}
                      onChange={e => updateEditItem(i, "color", e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      className="col-span-1 border border-gray-200 rounded px-2 py-1 text-xs"
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={e => updateEditItem(i, "unitPrice", e.target.value)}
                    />
                    <input
                      type="number"
                      min="1"
                      className="col-span-1 border border-gray-200 rounded px-2 py-1 text-xs"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => updateEditItem(i, "quantity", e.target.value)}
                    />
                    <button
                      onClick={() => removeEditItem(i)}
                      className="col-span-2 text-xs text-red-500 hover:underline text-right"
                    >
                      Remove
                    </button>
                    <input
                      className="col-span-12 border border-gray-100 rounded px-2 py-1 text-xs font-mono text-gray-400"
                      placeholder="Variant ID"
                      value={item.variantId}
                      onChange={e => updateEditItem(i, "variantId", e.target.value)}
                    />
                  </div>
                ))}
                <div className="px-5 py-3 text-right text-sm font-semibold text-gray-700">
                  Subtotal: {fmt(editItems.reduce((s, it) => s + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0), 0))}
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Delivery address */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Delivery Address</h2>
            {editing ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Recipient name"
                  value={editAddress.recipientName}
                  onChange={e => setEditAddress(a => ({ ...a, recipientName: e.target.value }))}
                />
                <input
                  className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Phone"
                  value={editAddress.phone}
                  onChange={e => setEditAddress(a => ({ ...a, phone: e.target.value }))}
                />
                <input
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Province"
                  value={editAddress.province}
                  onChange={e => setEditAddress(a => ({ ...a, province: e.target.value }))}
                />
                <input
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="District"
                  value={editAddress.district}
                  onChange={e => setEditAddress(a => ({ ...a, district: e.target.value }))}
                />
                <input
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="City"
                  value={editAddress.city}
                  onChange={e => setEditAddress(a => ({ ...a, city: e.target.value }))}
                />
                <input
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Area"
                  value={editAddress.area || ""}
                  onChange={e => setEditAddress(a => ({ ...a, area: e.target.value }))}
                />
                <input
                  className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Street"
                  value={editAddress.street || ""}
                  onChange={e => setEditAddress(a => ({ ...a, street: e.target.value }))}
                />
                <input
                  className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Landmark"
                  value={editAddress.landmark || ""}
                  onChange={e => setEditAddress(a => ({ ...a, landmark: e.target.value }))}
                />
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900">{order.address.recipientName}</p>
                <p className="text-sm text-gray-600">{order.address.phone}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {[order.address.area, order.address.street, order.address.city,
                    order.address.district, order.address.province].filter(Boolean).join(", ")}
                </p>
                {order.address.landmark && (
                  <p className="text-xs text-gray-400 mt-0.5">Near: {order.address.landmark}</p>
                )}
              </>
            )}
          </div>

          {/* Customer */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Customer</h2>
            {editing ? (
              <div className="space-y-2">
                <input
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Name"
                  value={editCustomer.name}
                  onChange={e => setEditCustomer(c => ({ ...c, name: e.target.value }))}
                />
                <input
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Email"
                  value={editCustomer.email}
                  onChange={e => setEditCustomer(c => ({ ...c, email: e.target.value }))}
                />
                <input
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Phone"
                  value={editCustomer.phone}
                  onChange={e => setEditCustomer(c => ({ ...c, phone: e.target.value }))}
                />
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-900">{order.userId?.name || "—"}</p>
                <p className="text-sm text-gray-500">{order.userId?.email}</p>
                {order.userId?.phone && <p className="text-sm text-gray-500">{order.userId.phone}</p>}
              </>
            )}
          </div>
        </div>

        {/* Right — actions */}
        <div className="space-y-5">
          {/* Status update */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
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
                        : "bg-brand-600 text-white hover:bg-brand-700"
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
          <div className="bg-white border border-gray-200 rounded-lg p-5">
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-400 space-y-1">
            <p>Order ID: <span className="font-mono text-gray-600">{order._id}</span></p>
            <p>Placed: {fmtDate(order.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
