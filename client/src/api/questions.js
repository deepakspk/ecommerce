import api from "./client";

export const getQuestions = (productId, params) =>
  api.get(`/products/${productId}/questions`, { params }).then((r) => r.data);

export const createQuestion = (productId, data) =>
  api.post(`/products/${productId}/questions`, data).then((r) => r.data);

export const answerQuestion = (productId, questionId, data) =>
  api.put(`/products/${productId}/questions/${questionId}/answer`, data).then((r) => r.data);
