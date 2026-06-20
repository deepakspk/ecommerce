import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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
  const navItems = user?.role === "SUPER_ADMIN"
    ? [...NAV, { to: "/admin/company-settings", label: "Company" }, { to: "/admin/settings", label: "Settings" }]
    : NAV;

  const sidebarContent = (
    <>
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="inline-block text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-brand-50 text-brand-700">
          Admin
        </span>
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
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-gray-200">
        <a href="/" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← Back to store
        </a>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <span className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-brand-50 text-brand-700">
          Admin
        </span>
        <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="text-gray-500 hover:text-gray-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-56 bg-white border-r border-gray-200 flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 text-gray-400 hover:text-gray-700"
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
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-200 flex-shrink-0 flex-col fixed top-0 bottom-0">
        {sidebarContent}
      </aside>

      <main className="flex-1 md:ml-56 min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
