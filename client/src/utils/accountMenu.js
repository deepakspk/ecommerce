export function getAccountMenuItems(user) {
  const isAdminViewer = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  return [
    isAdminViewer
      ? { key: "admin", label: "Admin Portal", to: "/admin" }
      : { key: "dashboard", label: "Dashboard", to: "/account" },
    { key: "orders", label: "My Orders", to: "/orders" },
    { key: "settings", label: "Settings", to: "/settings" },
  ];
}
