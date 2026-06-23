import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import * as ordersApi from "../api/orders";
import * as addressApi from "../api/addresses";
import Avatar from "../components/Avatar";
import Badge from "../components/Badge";
import { H1_CLASS, CARD_CLASS, SECTION_HEADING_CLASS, MUTED_CLASS } from "../utils/ui";

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-NP", { day: "numeric", month: "short", year: "numeric" });

function VerifyBadge({ ok, label }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${ok ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
      {label}: {ok ? "yes" : "no"}
    </span>
  );
}

function DashboardCard({ title, viewAllTo, viewAllLabel, children }) {
  return (
    <div className={`${CARD_CLASS} p-5 flex flex-col`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={SECTION_HEADING_CLASS}>{title}</h2>
        {viewAllTo && (
          <Link to={viewAllTo} className="text-xs font-medium text-brand-600 hover:underline flex-shrink-0">
            {viewAllLabel || "View all"} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { items: cartItems, itemCount: cartCount, subtotal } = useCart();
  const { items: wishlistItems, itemCount: wishlistCount } = useWishlist();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);

  useEffect(() => {
    ordersApi.getOrders()
      .then((d) => setOrders(d.orders))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
    addressApi.getAddresses()
      .then((d) => setAddresses(d.addresses))
      .catch(() => {})
      .finally(() => setAddressesLoading(false));
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!user) return null;

  const recentOrders = orders.slice(0, 3);
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className={`${H1_CLASS} mb-6`}>Welcome, {user.name}</h1>

      <div className="space-y-4">
        <DashboardCard title="Profile" viewAllTo="/settings" viewAllLabel="Edit profile">
          <div className="flex items-center gap-3 mb-3">
            <Avatar user={user} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-sm text-gray-500 truncate">{user.email || "—"}</p>
              <p className="text-sm text-gray-500">{user.phone || "—"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge kind="role" status={user.role} />
            <VerifyBadge ok={user.emailVerified} label="Email" />
            <VerifyBadge ok={user.phoneVerified} label="Phone" />
          </div>
        </DashboardCard>

        <div className="grid sm:grid-cols-2 gap-4">
          <DashboardCard title="Orders" viewAllTo="/orders" viewAllLabel="View all orders">
            {ordersLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-md animate-pulse" />)}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className={MUTED_CLASS}>
                No orders yet. <Link to="/products" className="text-brand-600 hover:underline">Start shopping →</Link>
              </p>
            ) : (
              <div className="space-y-1">
                {recentOrders.map((order) => (
                  <Link
                    key={order._id}
                    to={`/orders/${order._id}`}
                    className="flex items-center justify-between gap-2 text-sm hover:bg-gray-50 rounded-md px-2 py-1.5 -mx-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge kind="order" status={order.status} />
                      <span className="text-gray-400 text-xs flex-shrink-0">{fmtDate(order.createdAt)}</span>
                    </div>
                    <span className="font-medium text-gray-900 flex-shrink-0">{fmt(order.total)}</span>
                  </Link>
                ))}
              </div>
            )}
          </DashboardCard>

          <DashboardCard title="Cart" viewAllTo="/cart" viewAllLabel="View cart">
            {cartCount === 0 ? (
              <p className={MUTED_CLASS}>
                Your cart is empty. <Link to="/products" className="text-brand-600 hover:underline">Browse products →</Link>
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-700 mb-2">
                  {cartCount} item{cartCount !== 1 ? "s" : ""} — <span className="font-semibold">{fmt(subtotal)}</span>
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  {cartItems.slice(0, 3).map((i) => (
                    <li key={i.variantId} className="truncate">{i.productName}</li>
                  ))}
                </ul>
              </>
            )}
          </DashboardCard>

          <DashboardCard title="Wishlist" viewAllTo="/wishlist" viewAllLabel="View wishlist">
            {wishlistCount === 0 ? (
              <p className={MUTED_CLASS}>Your wishlist is empty.</p>
            ) : (
              <ul className="text-sm text-gray-500 space-y-1">
                {wishlistItems.slice(0, 3).map((i) => (
                  <li key={i.productId} className="truncate">{i.productName}</li>
                ))}
              </ul>
            )}
          </DashboardCard>

          <DashboardCard title="Shipping Addresses" viewAllTo="/addresses" viewAllLabel="Manage addresses">
            {addressesLoading ? (
              <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
            ) : !defaultAddress ? (
              <p className={MUTED_CLASS}>No saved addresses yet.</p>
            ) : (
              <div className="text-sm text-gray-700">
                <p className="font-medium text-gray-900">{defaultAddress.recipientName}</p>
                <p className="text-gray-500">
                  {[defaultAddress.area, defaultAddress.city, defaultAddress.district].filter(Boolean).join(", ")}
                </p>
                {addresses.length > 1 && (
                  <p className={`${MUTED_CLASS} mt-1`}>+{addresses.length - 1} more saved</p>
                )}
              </div>
            )}
          </DashboardCard>
        </div>
      </div>

      <button onClick={handleLogout} className="mt-6 text-sm text-red-600 hover:text-red-700 font-medium">
        Log out
      </button>
    </div>
  );
}
