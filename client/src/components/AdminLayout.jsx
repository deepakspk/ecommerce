import { useState, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const THEME_KEY = "admin_theme_mode";
const COLLAPSE_KEY = "admin_sidebar_collapsed";

function Icon({ path, className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS = {
  dashboard: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
  orders: "M3 7.5l9-4.5 9 4.5M3 7.5l9 4.5 9-4.5M3 7.5v9l9 4.5 9-4.5v-9",
  returns: "M9 15L3 9m0 0l6-6M3 9h12a6 6 0 0 1 0 12h-3",
  banners: "M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18-3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm0 0h.008v.008h-.008V8.25Z",
  categories: "M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3ZM6 6h.008v.008H6V6Z",
  products: "M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25M21 7.5v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9.75v9.75",
  inventory: "M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z",
  coupons: "M21 12a2.25 2.25 0 0 0-2.25 2.25v.5a.75.75 0 0 1-.75.75H6a.75.75 0 0 1-.75-.75v-.5a2.25 2.25 0 0 0-2.25-2.25v-2.5A2.25 2.25 0 0 1 5.25 7.25h.5a.75.75 0 0 0 .75-.75V6a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 .75.75v.5a.75.75 0 0 0 .75.75h.5A2.25 2.25 0 0 1 21 9.5v2.5Z",
  users: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  auditLog: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  reports: "M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941",
  company: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
  theme: "M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42",
  settings: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a7.665 7.665 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  back: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18",
  chevron: "M15.75 19.5L8.25 12l7.5-7.5",
};

function ThemeToggle({ mode, onToggle, className = "" }) {
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors flex-shrink-0 ${className}`}
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

function CollapseToggle({ collapsed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
    >
      <Icon path={ICONS.chevron} className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
    </button>
  );
}

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/admin/orders", label: "Orders", icon: "orders" },
  { to: "/admin/returns", label: "Returns", icon: "returns" },
  { to: "/admin/banners", label: "Banners", icon: "banners" },
  { to: "/admin/categories", label: "Categories", icon: "categories" },
  { to: "/admin/products", label: "Products", icon: "products" },
  { to: "/admin/inventory", label: "Inventory", icon: "inventory" },
  { to: "/admin/coupons", label: "Coupons", icon: "coupons" },
  { to: "/admin/users", label: "Users", icon: "users" },
  { to: "/admin/audit-log", label: "Audit Log", icon: "auditLog" },
  { to: "/admin/reports", label: "Reports", icon: "reports" },
];

function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function roleLabel(role) {
  return role === "SUPER_ADMIN" ? "Super Admin" : "Admin";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function AdminLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");

  useEffect(() => {
    localStorage.setItem(THEME_KEY, mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  function toggleMode() {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }

  const navItems = user?.role === "SUPER_ADMIN"
    ? [
        ...NAV,
        { to: "/admin/company-settings", label: "Company", icon: "company" },
        { to: "/admin/theme-settings", label: "Theme", icon: "theme" },
        { to: "/admin/settings", label: "Settings", icon: "settings" },
      ]
    : NAV;

  function sidebarHeader({ isCollapsed, showCollapseToggle }) {
    return (
      <div
        className={`bg-slate-300/60 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 p-4 space-y-3 ${
          isCollapsed ? "flex flex-col items-center" : ""
        }`}
      >
        <div className={isCollapsed ? "flex flex-col items-center gap-1.5" : ""}>
          {!isCollapsed && (
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 truncate mb-2">{getGreeting()}</p>
          )}
          <div className={`flex items-center gap-3 ${isCollapsed ? "flex-col gap-1.5" : ""}`}>
            <div
              className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0"
              title={user?.name}
            >
              {initialsOf(user?.name)}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.name || "—"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.phone || user?.email || roleLabel(user?.role)}</p>
              </div>
            )}
          </div>
        </div>
        <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "justify-between"}`}>
          {!isCollapsed && (
            <span className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              Admin
            </span>
          )}
          <div className={`flex items-center gap-1 ${isCollapsed ? "flex-col" : ""}`}>
            <ThemeToggle mode={mode} onToggle={toggleMode} />
            {showCollapseToggle && <CollapseToggle collapsed={isCollapsed} onToggle={() => setCollapsed((c) => !c)} />}
          </div>
        </div>
      </div>
    );
  }

  function sidebarNav({ isCollapsed, onNavigate }) {
    return (
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={isCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md text-sm font-medium transition-colors ${
                isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
              } ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`
            }
          >
            <Icon path={ICONS[item.icon]} className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    );
  }

  function sidebarFooter({ isCollapsed }) {
    return (
      <div className={`px-4 py-4 border-t border-gray-200 dark:border-gray-800 ${isCollapsed ? "flex justify-center" : ""}`}>
        <a
          href="/"
          title="Back to store"
          className={`flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 transition-colors ${isCollapsed ? "justify-center" : ""}`}
        >
          <Icon path={ICONS.back} className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Back to store</span>}
        </a>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen bg-gray-50 dark:bg-gray-950 ${mode === "dark" ? "dark" : ""}`}>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-200 border-b border-gray-300 dark:bg-gray-900 dark:border-gray-800 flex items-center justify-between px-4 py-3">
        <span className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
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

      {/* Mobile overlay drawer — always shown expanded */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-slate-200 border-r border-gray-300 dark:bg-gray-900 dark:border-gray-800 flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {sidebarHeader({ isCollapsed: false, showCollapseToggle: false })}
            {sidebarNav({ isCollapsed: false, onNavigate: () => setSidebarOpen(false) })}
            {sidebarFooter({ isCollapsed: false })}
          </aside>
        </div>
      )}

      {/* Desktop fixed sidebar — collapsible */}
      <aside
        className={`hidden md:flex bg-slate-200 border-r border-gray-300 dark:bg-gray-900 dark:border-gray-800 flex-shrink-0 flex-col fixed top-0 bottom-0 transition-all duration-200 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarHeader({ isCollapsed: collapsed, showCollapseToggle: true })}
        {sidebarNav({ isCollapsed: collapsed, onNavigate: undefined })}
        {sidebarFooter({ isCollapsed: collapsed })}
      </aside>

      <main className={`flex-1 min-w-0 pt-14 md:pt-0 transition-all duration-200 ${collapsed ? "md:ml-20" : "md:ml-64"}`}>
        <Outlet />
      </main>
    </div>
  );
}
