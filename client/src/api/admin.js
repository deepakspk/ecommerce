import api from "./client";

export const pingAdmin = () => api.get("/admin/ping").then(r => r.data);

// Categories
export const getCategories = () => api.get("/admin/categories").then(r => r.data);
export const getCategoryTree = () => api.get("/admin/categories/tree").then(r => r.data);
export const getCategory = (id) => api.get(`/admin/categories/${id}`).then(r => r.data);
export const getCategoryStats = (id) => api.get(`/admin/categories/${id}/stats`).then(r => r.data);
export const getCategoryBreadcrumbs = (id) => api.get(`/admin/categories/${id}/breadcrumbs`).then(r => r.data);
export const createCategory = (formData) => api.post("/admin/categories", formData).then(r => r.data);
export const updateCategory = (id, formData) => api.put(`/admin/categories/${id}`, formData).then(r => r.data);
export const deleteCategory = (id, force = false) =>
  api.delete(`/admin/categories/${id}`, { params: force ? { force: "true" } : {} }).then(r => r.data);
export const reorderCategories = (items) => api.patch("/admin/categories/reorder", { items }).then(r => r.data);

// Products
export const getProducts = () => api.get("/admin/products").then(r => r.data);
export const getProduct = (id) => api.get(`/admin/products/${id}`).then(r => r.data);
export const createProduct = (formData) => api.post("/admin/products", formData).then(r => r.data);
export const updateProduct = (id, formData) => api.put(`/admin/products/${id}`, formData).then(r => r.data);
export const deleteProduct = (id) => api.delete(`/admin/products/${id}`).then(r => r.data);

// Variants
export const addVariant = (productId, data) =>
  api.post(`/admin/products/${productId}/variants`, data).then(r => r.data);
export const updateVariant = (productId, variantId, data) =>
  api.put(`/admin/products/${productId}/variants/${variantId}`, data).then(r => r.data);
export const deleteVariant = (productId, variantId) =>
  api.delete(`/admin/products/${productId}/variants/${variantId}`).then(r => r.data);

// Dashboard
export const getDashboardStats = () => api.get("/admin/stats").then(r => r.data);

// Orders
export const listAdminOrders = (params) => api.get("/admin/orders", { params }).then(r => r.data);
export const getAdminOrder = (id) => api.get(`/admin/orders/${id}`).then(r => r.data);
export const updateOrder = (id, data) => api.put(`/admin/orders/${id}`, data).then(r => r.data);
export const updateOrderStatus = (id, status) =>
  api.patch(`/admin/orders/${id}/status`, { status }).then(r => r.data);
export const markOrderPaid = (id) => api.patch(`/admin/orders/${id}/paid`).then(r => r.data);
export const downloadOrderInvoice = (id) =>
  api.get(`/admin/orders/${id}/invoice`, { responseType: "blob" }).then(r => r.data);

// Coupons
export const getCoupons = () => api.get("/admin/coupons").then(r => r.data);
export const getCoupon = (id) => api.get(`/admin/coupons/${id}`).then(r => r.data);
export const createCoupon = (data) => api.post("/admin/coupons", data).then(r => r.data);
export const updateCoupon = (id, data) => api.put(`/admin/coupons/${id}`, data).then(r => r.data);
export const deleteCoupon = (id) => api.delete(`/admin/coupons/${id}`).then(r => r.data);

// Inventory
export const getInventory = () => api.get("/admin/inventory").then(r => r.data);
export const adjustStock = (variantId, data) =>
  api.post(`/admin/inventory/${variantId}/adjust`, data).then(r => r.data);
export const getLogs = (variantId) =>
  api.get(`/admin/inventory/${variantId}/logs`).then(r => r.data);

// Returns
export const listAdminReturns = (params) => api.get("/admin/returns", { params }).then(r => r.data);
export const getAdminReturn = (id) => api.get(`/admin/returns/${id}`).then(r => r.data);
export const updateReturnStatus = (id, data) => api.patch(`/admin/returns/${id}/status`, data).then(r => r.data);

// Users
export const listUsers = (params) => api.get("/admin/users", { params }).then(r => r.data);
export const updateUserRole = (id, role) => api.patch(`/admin/users/${id}/role`, { role }).then(r => r.data);
export const updateUserStatus = (id, status) => api.patch(`/admin/users/${id}/status`, { status }).then(r => r.data);

// Audit log
export const listAuditLog = (params) => api.get("/admin/audit-log", { params }).then(r => r.data);

// Reports
export const getReportSummary = (params) => api.get("/admin/reports/summary", { params }).then(r => r.data);
export const exportOrdersCsv = (params) =>
  api.get("/admin/reports/export", { params, responseType: "blob" }).then(r => r.data);

// Banners
export const getBanners = () => api.get("/admin/banners").then(r => r.data);
export const createBanner = (formData) => api.post("/admin/banners", formData).then(r => r.data);
export const updateBanner = (id, formData) => api.put(`/admin/banners/${id}`, formData).then(r => r.data);
export const deleteBanner = (id) => api.delete(`/admin/banners/${id}`).then(r => r.data);
export const reorderBanners = (items) => api.patch("/admin/banners/reorder", { items }).then(r => r.data);

// Company Settings
export const getCompanySettingsAdmin = () => api.get("/admin/company-settings").then(r => r.data);
export const updateCompanySettings = (formData) =>
  api.put("/admin/company-settings", formData).then(r => r.data);

// Theme Settings
export const getThemeSettingsAdmin = () => api.get("/admin/theme-settings").then(r => r.data);
export const updateThemeSettings = (data) => api.put("/admin/theme-settings", data).then(r => r.data);

// Logistics
export const listLogisticsProviders = () => api.get("/admin/logistics/providers").then(r => r.data);
export const getProviderBranches = (code) =>
  api.get(`/admin/logistics/providers/${code}/branches`).then(r => r.data);
export const getShippingRatePreview = (code, params) =>
  api.post(`/admin/logistics/providers/${code}/rate`, params).then(r => r.data);
export const createShipment = (orderId, data) =>
  api.post(`/admin/orders/${orderId}/shipment`, data).then(r => r.data);
export const getShipment = (orderId) => api.get(`/admin/orders/${orderId}/shipment`).then(r => r.data);
export const refreshShipmentTracking = (shipmentId) =>
  api.post(`/admin/shipments/${shipmentId}/refresh`).then(r => r.data);
export const markShipmentReturn = (shipmentId, reason) =>
  api.post(`/admin/shipments/${shipmentId}/return`, { reason }).then(r => r.data);
export const getShipmentLabel = (shipmentId) =>
  api.get(`/admin/shipments/${shipmentId}/label`).then(r => r.data);
export const getShipmentDetails = (shipmentId) =>
  api.get(`/admin/shipments/${shipmentId}/details`).then(r => r.data);
export const getShipmentComments = (shipmentId) =>
  api.get(`/admin/shipments/${shipmentId}/comments`).then(r => r.data);
export const addShipmentComment = (shipmentId, message) =>
  api.post(`/admin/shipments/${shipmentId}/comments`, { message }).then(r => r.data);
