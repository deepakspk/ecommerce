import api from "./client";

export function signup(data) {
  return api.post("/auth/signup", data).then((res) => res.data);
}

export function login(data) {
  return api.post("/auth/login", data).then((res) => res.data);
}

export function verifyEmail(token) {
  return api.get(`/auth/verify-email/${token}`).then((res) => res.data);
}

export function forgotPassword(email) {
  return api.post("/auth/forgot-password", { email }).then((res) => res.data);
}

export function resetPassword(token, password) {
  return api.post(`/auth/reset-password/${token}`, { password }).then((res) => res.data);
}

export function requestOtp(phone) {
  return api.post("/auth/otp/request", { phone }).then((res) => res.data);
}

export function verifyOtp(phone, code) {
  return api.post("/auth/otp/verify", { phone, code }).then((res) => res.data);
}

export function getMe() {
  return api.get("/auth/me").then((res) => res.data);
}

export function getGoogleAuthUrl() {
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return `${baseURL}/auth/google`;
}
