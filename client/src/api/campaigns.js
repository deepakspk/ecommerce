import api from "./client";

export const getHomeCampaigns = () => api.get("/campaigns/home").then((r) => r.data);
export const getCampaignBySlug = (slug) => api.get(`/campaigns/${slug}`).then((r) => r.data);
