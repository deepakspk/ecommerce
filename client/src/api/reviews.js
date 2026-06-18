import api from "./client";

export const getReviews = (productId, params) =>
  api.get(`/products/${productId}/reviews`, { params }).then((r) => r.data);

export const getEligibility = (productId) =>
  api.get(`/products/${productId}/reviews/eligibility`).then((r) => r.data);

export const createReview = (productId, data) =>
  api.post(`/products/${productId}/reviews`, data).then((r) => r.data);
