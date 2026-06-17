import api from "./client";

export const getCart = () => api.get("/cart").then((r) => r.data);
export const addToCart = (variantId, quantity = 1) =>
  api.post("/cart/items", { variantId, quantity }).then((r) => r.data);
export const updateItem = (variantId, quantity) =>
  api.put(`/cart/items/${variantId}`, { quantity }).then((r) => r.data);
export const removeItem = (variantId) =>
  api.delete(`/cart/items/${variantId}`).then((r) => r.data);
export const clearCart = () => api.delete("/cart").then((r) => r.data);
export const mergeCart = (items) =>
  api.post("/cart/merge", { items }).then((r) => r.data);
