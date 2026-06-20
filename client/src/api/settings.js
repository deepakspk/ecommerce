import api from "./client";

export const getSettings = () => api.get("/admin/settings").then(r => r.data);
export const updateSettingsGroup = (group, values) =>
  api.put(`/admin/settings/${group}`, values).then(r => r.data);
export const exportSettings = () => api.get("/admin/settings/export").then(r => r.data);
