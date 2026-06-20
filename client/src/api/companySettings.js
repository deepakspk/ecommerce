import api from "./client";

export const getCompanySettings = () => api.get("/settings/company").then(r => r.data);
