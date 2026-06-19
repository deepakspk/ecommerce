const BASE_URL = process.env.NCM_BASE_URL || "https://demo.nepalcanmove.com/api";

function authHeaders() {
  return {
    Authorization: `Token ${process.env.NCM_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function extractErrorMessage(data) {
  if (data.detail) return data.detail;
  if (data.Error && typeof data.Error === "object") return Object.values(data.Error)[0];
  return data.message || "NCM request failed";
}

async function ncmRequest(path, { method = "GET", body, version = "v1" } = {}) {
  const res = await fetch(`${BASE_URL}/${version}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(extractErrorMessage(data));
    err.status = 502;
    err.raw = data;
    throw err;
  }
  return data;
}

export const getBranches = () => ncmRequest("/branches", { version: "v2" });

export const getShippingRate = ({ creation, destination, type }) =>
  ncmRequest(`/shipping-rate?${new URLSearchParams({ creation, destination, type })}`);

export const getOrderStatus = (id) => ncmRequest(`/order/status?${new URLSearchParams({ id })}`);

export const createOrder = (payload) => ncmRequest("/order/create", { method: "POST", body: payload });

export const createComment = (orderid, comments) =>
  ncmRequest("/comment", { method: "POST", body: { orderid, comments } });

export const markVendorReturn = (pk, comment) =>
  ncmRequest("/vendor/order/return", { method: "POST", body: { pk, comment }, version: "v2" });
