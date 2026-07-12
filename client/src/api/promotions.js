import api from "./client";

export const getActivePromotions = () => api.get("/promotions").then(r => r.data);
