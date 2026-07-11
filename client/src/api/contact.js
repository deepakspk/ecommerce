import api from "./client";

export const submitContactMessage = (data) => api.post("/contact", data).then((r) => r.data);
