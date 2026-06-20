import * as settingsService from "../services/settingsService.js";

const BASE_URL = process.env.KHALTI_BASE_URL || "https://dev.khalti.com/api/v2";

async function khaltiRequest(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${settingsService.get("KHALTI_SECRET_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.detail || data.error_key || "Khalti request failed");
    err.status = 502;
    err.raw = data;
    throw err;
  }
  return data;
}

export function initiatePayment(payload) {
  return khaltiRequest("/epayment/initiate/", payload);
}

export function lookupPayment(pidx) {
  return khaltiRequest("/epayment/lookup/", { pidx });
}
