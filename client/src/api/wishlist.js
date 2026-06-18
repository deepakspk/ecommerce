import api from "./client";

export const getWishlist = () => api.get("/wishlist").then((r) => r.data);
export const addToWishlist = (productId) => api.post("/wishlist/items", { productId }).then((r) => r.data);
export const removeItem = (productId) => api.delete(`/wishlist/items/${productId}`).then((r) => r.data);
export const clearWishlist = () => api.delete("/wishlist").then((r) => r.data);
export const mergeWishlist = (items) => api.post("/wishlist/merge", { items }).then((r) => r.data);
