import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { CONTAINER_CLASS } from "../utils/ui";

function SearchForm({ className, value, onChange, onSubmit, onClear }) {
  return (
    <form onSubmit={onSubmit} className={`${className} flex items-stretch`}>
      <div className="relative flex-1 flex items-center border border-gray-300 rounded-l-full overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="Search for products…"
          className="w-full pl-4 pr-8 py-2.5 text-sm focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <button
        type="submit"
        aria-label="Search"
        className="px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-r-full flex items-center justify-center transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      </button>
    </form>
  );
}

function NavIconLink({ to, label, icon, badge, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 text-gray-700 hover:text-brand-600 flex-shrink-0"
    >
      <span className="relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-brand-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="text-[11px] font-medium whitespace-nowrap">{label}</span>
    </Link>
  );
}

const TrackOrderIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 0h-12" />
  </svg>
);

const WishlistIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
  </svg>
);

const CartIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M2.25 3h1.386c.51 0 .955.343 1.087.836l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.273M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
  </svg>
);

const AccountIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
  </svg>
);

export default function Navbar() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearchSubmit(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    setMenuOpen(false);
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  }

  const accountTarget = user ? "/account" : "/login";

  return (
    <nav className="border-b border-gray-200 py-3">
      <div className={CONTAINER_CLASS}>
        <div className="flex items-center gap-4">
          <Link to="/" className="font-semibold text-lg text-gray-900 flex-shrink-0">
            Ecommerce Nepal
          </Link>

          <SearchForm
            className="hidden sm:flex flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSubmit={handleSearchSubmit}
            onClear={() => setSearchQuery("")}
          />

          <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
            {user?.role === "ADMIN" && (
              <Link to="/admin" className="text-sm text-brand-600 hover:text-brand-800 font-medium">
                Admin
              </Link>
            )}
            <NavIconLink to="/orders" label="Track Order" icon={TrackOrderIcon} />
            <NavIconLink to="/wishlist" label="Wishlist" icon={WishlistIcon} badge={wishlistCount} />
            <NavIconLink to="/cart" label="Cart" icon={CartIcon} badge={itemCount} />
            <NavIconLink to={accountTarget} label="Account" icon={AccountIcon} />
          </div>

          {/* Mobile: brand row icons + hamburger */}
          <div className="flex sm:hidden items-center gap-4 ml-auto flex-shrink-0">
            <Link to="/wishlist" className="relative text-gray-600 hover:text-gray-900" aria-label="Wishlist" onClick={() => setMenuOpen(false)}>
              {WishlistIcon}
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>
            <Link to="/cart" className="relative text-gray-600 hover:text-gray-900" aria-label="Cart" onClick={() => setMenuOpen(false)}>
              {CartIcon}
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <SearchForm
          className="sm:hidden mt-3"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onSubmit={handleSearchSubmit}
          onClear={() => setSearchQuery("")}
        />

        {/* Mobile dropdown panel */}
        {menuOpen && (
          <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3 text-sm">
            <Link to="/orders" className="text-gray-600 hover:text-gray-900" onClick={() => setMenuOpen(false)}>
              Track Order
            </Link>
            <Link to={accountTarget} className="text-gray-600 hover:text-gray-900" onClick={() => setMenuOpen(false)}>
              Account
            </Link>
            {user?.role === "ADMIN" && (
              <Link to="/admin" className="text-brand-600 hover:text-brand-800 font-medium" onClick={() => setMenuOpen(false)}>
                Admin
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
