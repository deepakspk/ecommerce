import api from "./client";

export const getRootCategories = () => api.get("/categories/root").then((r) => r.data);
export const getCategoryTree = () => api.get("/categories/tree").then((r) => r.data);
export const getCategoryById = (id) => api.get(`/categories/${id}`).then((r) => r.data);
export const getChildren = (id) => api.get(`/categories/${id}/children`).then((r) => r.data);
export const getBreadcrumbs = (id) => api.get(`/categories/${id}/breadcrumbs`).then((r) => r.data);
export const searchCategories = (q) => api.get("/categories/search", { params: { q } }).then((r) => r.data);
