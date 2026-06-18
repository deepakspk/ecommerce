import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/login");
  }

  const CartLink = (
    <Link to="/cart" className="relative text-gray-600 hover:text-gray-900" aria-label="Cart" onClick={() => setMenuOpen(false)}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.836l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.273M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </Link>
  );

  return (
    <nav className="border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-6">
          <Link to="/" className="font-semibold text-lg text-gray-900">
            Ecommerce Nepal
          </Link>
          <Link to="/products" className="text-sm text-gray-600 hover:text-gray-900">
            Products
          </Link>
          {user && (
            <Link to="/orders" className="text-sm text-gray-600 hover:text-gray-900">
              Orders
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link to="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Admin
            </Link>
          )}
        </div>

        {/* Mobile: brand + hamburger */}
        <div className="flex sm:hidden items-center justify-between w-full">
          <Link to="/" className="font-semibold text-lg text-gray-900" onClick={() => setMenuOpen(false)}>
            Ecommerce Nepal
          </Link>
          <div className="flex items-center gap-4">
            {CartLink}
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

        <div className="hidden sm:flex items-center gap-4 text-sm">
          {CartLink}

          {user ? (
            <>
              <span className="text-gray-700">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-700 hover:text-gray-900">
                Login
              </Link>
              <Link to="/signup" className="text-gray-700 hover:text-gray-900">
                Signup
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3 text-sm">
          <Link to="/products" className="text-gray-600 hover:text-gray-900" onClick={() => setMenuOpen(false)}>
            Products
          </Link>
          {user && (
            <Link to="/orders" className="text-gray-600 hover:text-gray-900" onClick={() => setMenuOpen(false)}>
              Orders
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link to="/admin" className="text-blue-600 hover:text-blue-800 font-medium" onClick={() => setMenuOpen(false)}>
              Admin
            </Link>
          )}
          {user ? (
            <>
              <span className="text-gray-700">{user.name}</span>
              <button onClick={handleLogout} className="text-red-600 hover:text-red-700 font-medium text-left">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-700 hover:text-gray-900" onClick={() => setMenuOpen(false)}>
                Login
              </Link>
              <Link to="/signup" className="text-gray-700 hover:text-gray-900" onClick={() => setMenuOpen(false)}>
                Signup
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
