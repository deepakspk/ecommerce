import { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const THEME_KEY = "admin_theme_mode";

function ThemeToggle({ mode, onToggle, className = "" }) {
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors ${className}`}
    >
      {isDark ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-2.227-1.591 1.591M5.25 12H3m2.227-4.773L3.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      )}
    </button>
  );
}

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/returns", label: "Returns" },
  { to: "/admin/banners", label: "Banners" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/inventory", label: "Inventory" },
  { to: "/admin/coupons", label: "Coupons" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/audit-log", label: "Audit Log" },
  { to: "/admin/reports", label: "Reports" },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState(() => localStorage.getItem(THEME_KEY) || "light");

  useEffect(() => {
    localStorage.setItem(THEME_KEY, mode);
  }, [mode]);

  function toggleMode() {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }

  const navItems = user?.role === "SUPER_ADMIN"
    ? [
        ...NAV,
        { to: "/admin/company-settings", label: "Company" },
        { to: "/admin/theme-settings", label: "Theme" },
        { to: "/admin/settings", label: "Settings" },
      ]
    : NAV;

  const sidebarContent = (
    <>
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <span className="inline-block text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          Admin
        </span>
        <ThemeToggle mode={mode} onToggle={toggleMode} />
      </div>
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 transition-colors">
          ← Back to store
        </a>
      </div>
    </>
  );

  return (
    <div className={`flex min-h-screen bg-gray-50 dark:bg-gray-950 ${mode === "dark" ? "dark" : ""}`}>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800 flex items-center justify-between px-4 py-3">
        <span className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          Admin
        </span>
        <div className="flex items-center gap-1">
          <ThemeToggle mode={mode} onToggle={toggleMode} />
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile overlay drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-56 bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop fixed sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 flex-shrink-0 flex-col fixed top-0 bottom-0">
        {sidebarContent}
      </aside>

      <main className="flex-1 md:ml-56 min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
