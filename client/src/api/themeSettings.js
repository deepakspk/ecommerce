import api from "./client";

export const getThemeSettings = () => api.get("/settings/theme").then(r => r.data);
