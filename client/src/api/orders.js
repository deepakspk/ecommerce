import api from "./client";

export const createOrder = (data) => api.post("/orders", data).then(r => r.data);
export const getOrders = () => api.get("/orders").then(r => r.data);
export const getOrder = (id) => api.get(`/orders/${id}`).then(r => r.data);
export const cancelOrder = (id) => api.post(`/orders/${id}/cancel`).then(r => r.data);
export const requestReturn = (id, items) => api.post(`/orders/${id}/return`, { items }).then(r => r.data);
export const getMyReturnRequests = (id) => api.get(`/orders/${id}/return`).then(r => r.data);
export const downloadInvoice = (id) =>
  api.get(`/orders/${id}/invoice`, { responseType: "blob" }).then(r => r.data);
