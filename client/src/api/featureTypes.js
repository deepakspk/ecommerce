import api from "./client";

export const getActiveFeatureTypes = () => api.get("/feature-types").then((r) => r.data);
