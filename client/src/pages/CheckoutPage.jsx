import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import * as addressApi from "../api/addresses";
import * as ordersApi from "../api/orders";
import * as paymentsApi from "../api/payments";
import { getErrorMessage } from "../utils/errorHelpers";
import { submitEsewaForm } from "../utils/esewaForm";
import ItemThumb from "../components/ItemThumb";

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;

const PLACE_ORDER_LABELS = {
  COD: "Place Order — Cash on Delivery",
  KHALTI: "Place Order — Pay with Khalti",
  ESEWA: "Place Order — Pay with eSewa",
};

const PAYMENT_FOOTNOTES = {
  COD: "Pay when your order arrives",
  KHALTI: "You'll be redirected to Khalti to complete payment",
  ESEWA: "You'll be redirected to eSewa to complete payment",
};

function calcDeliveryFee(province) {
  return province?.toLowerCase().trim() === "bagmati" ? 100 : 200;
}

function AddressCard({ address, selected, onSelect }) {
  const parts = [address.area, address.street, address.city, address.district, address.province].filter(Boolean);
  return (
    <label className={`flex gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${
      selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-400"
    }`}>
      <input type="radio" name="address" value={address._id} checked={selected}
        onChange={() => onSelect(address._id)} className="mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          {address.label && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{address.label}</span>
          )}
          {address.isDefault && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Default</span>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-900">{address.recipientName}</p>
        <p className="text-sm text-gray-600">{address.phone}</p>
        <p className="text-sm text-gray-500 mt-0.5">{parts.join(", ")}</p>
        {address.landmark && <p className="text-xs text-gray-400 mt-0.5">Near: {address.landmark}</p>}
      </div>
    </label>
  );
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [selectedAddrId, setSelectedAddrId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    addressApi.getAddresses().then(data => {
      setAddresses(data.addresses);
      const def = data.addresses.find(a => a.isDefault) ?? data.addresses[0];
      if (def) setSelectedAddrId(def._id);
    }).catch(() => {}).finally(() => setAddrLoading(false));
  }, []);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
        <Link to="/products" className="text-blue-600 hover:underline text-sm">Browse products →</Link>
      </div>
    );
  }

  const selectedAddress = addresses.find(a => a._id === selectedAddrId);
  const deliveryFee = selectedAddress ? calcDeliveryFee(selectedAddress.province) : 0;
  const total = subtotal + deliveryFee;

  async function handlePlaceOrder() {
    if (!selectedAddrId) { setError("Please select a delivery address."); return; }
    setError("");
    setPlacing(true);
    try {
      const { order } = await ordersApi.createOrder({ addressId: selectedAddrId, paymentMethod });
      await clearCart();

      if (paymentMethod === "KHALTI") {
        const { paymentUrl } = await paymentsApi.initiateKhalti(order._id);
        window.location.href = paymentUrl;
        return;
      }

      if (paymentMethod === "ESEWA") {
        const { formUrl, fields } = await paymentsApi.initiateEsewa(order._id);
        submitEsewaForm({ formUrl, fields });
        return;
      }

      navigate(`/orders/${order._id}`);
    } catch (e) {
      setError(e.response ? getErrorMessage(e) : e.message);
      setPlacing(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* ── Left: Delivery address ─────────────────────────── */}
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4">Delivery Address</h2>

          {addrLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : addresses.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <p className="text-gray-500 mb-3 text-sm">No saved addresses.</p>
              <Link to="/addresses" className="text-blue-600 hover:underline text-sm font-medium">
                Add a delivery address →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map(a => (
                <AddressCard key={a._id} address={a} selected={selectedAddrId === a._id}
                  onSelect={setSelectedAddrId} />
              ))}
              <Link to="/addresses" className="inline-block text-sm text-blue-600 hover:underline mt-1">
                + Add new address
              </Link>
            </div>
          )}
        </section>

        {/* ── Right: Order summary + place order ────────────── */}
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4">Order Summary</h2>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="space-y-3 mb-5">
              {items.map(item => {
                const unitPrice = item.variantPrice ?? item.basePrice;
                return (
                  <div key={item.variantId} className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-12 h-14 rounded-lg overflow-hidden bg-gray-100">
                      <ItemThumb src={item.imageUrl} alt={item.productName} width={100} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.size} · {item.color} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-800 flex-shrink-0">
                      {fmt(unitPrice * item.quantity)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery fee</span>
                <span>{selectedAddress ? fmt(deliveryFee) : "—"}</span>
              </div>
              {selectedAddress && selectedAddress.province.toLowerCase() === "bagmati" && (
                <p className="text-xs text-green-600">Kathmandu valley discount applied</p>
              )}
              <div className="flex justify-between font-semibold text-gray-900 text-base border-t border-gray-100 pt-2 mt-1">
                <span>Total</span>
                <span>{selectedAddress ? fmt(total) : "—"}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
              <p className="text-sm font-semibold text-gray-800 mb-1">Payment Method</p>
              <label className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                paymentMethod === "COD" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"
              }`}>
                <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === "COD"}
                  onChange={() => setPaymentMethod("COD")} />
                <span className="text-sm text-gray-800">Cash on Delivery</span>
              </label>
              <label className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                paymentMethod === "KHALTI" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"
              }`}>
                <input type="radio" name="paymentMethod" value="KHALTI" checked={paymentMethod === "KHALTI"}
                  onChange={() => setPaymentMethod("KHALTI")} />
                <span className="text-sm text-gray-800">Pay with Khalti</span>
              </label>
              <label className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                paymentMethod === "ESEWA" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-400"
              }`}>
                <input type="radio" name="paymentMethod" value="ESEWA" checked={paymentMethod === "ESEWA"}
                  onChange={() => setPaymentMethod("ESEWA")} />
                <span className="text-sm text-gray-800">Pay with eSewa</span>
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-4">{error}</p>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={placing || !selectedAddrId || addresses.length === 0}
              className="w-full mt-5 bg-blue-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {placing ? "Placing order…" : PLACE_ORDER_LABELS[paymentMethod]}
            </button>

            <p className="text-xs text-center text-gray-400 mt-2">{PAYMENT_FOOTNOTES[paymentMethod]}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
