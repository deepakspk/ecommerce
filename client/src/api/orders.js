import api from "./client";

export const createOrder = (data) => api.post("/orders", data).then(r => r.data);
export const getOrders = () => api.get("/orders").then(r => r.data);
export const getOrder = (id) => api.get(`/orders/${id}`).then(r => r.data);
