import api from "./client";

export const getAvailableFilters = () => api.get("/products/available-filters").then((r) => r.data);
export const getProducts = (params) => api.get("/products", { params }).then((r) => r.data);
export const getProduct = (slug) => api.get(`/products/${slug}`).then((r) => r.data);
