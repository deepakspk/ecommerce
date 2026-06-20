import api from "./client";

export const getBanners = () => api.get("/banners").then(r => r.data);
