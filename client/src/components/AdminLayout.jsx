import { NavLink, Outlet } from "react-router-dom";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/inventory", label: "Inventory" },
];

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-gray-900 text-gray-100 flex-shrink-0 flex flex-col fixed top-0 bottom-0">
        <div className="px-6 py-5 border-b border-gray-700">
          <span className="text-sm font-bold tracking-widest text-white uppercase">Admin</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-gray-700">
          <a href="/" className="text-xs text-gray-400 hover:text-white transition-colors">
            ← Back to store
          </a>
        </div>
      </aside>

      <main className="flex-1 ml-56 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
