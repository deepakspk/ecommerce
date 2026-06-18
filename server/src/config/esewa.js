import crypto from "crypto";

const FORM_URL = process.env.ESEWA_FORM_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const STATUS_URL = process.env.ESEWA_STATUS_URL || "https://rc.esewa.com.np/api/epay/transaction/status/";
const PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";

function sign(fields, signedFieldNames) {
  const message = signedFieldNames.map((name) => `${name}=${fields[name]}`).join(",");
  return crypto.createHmac("sha256", process.env.ESEWA_SECRET_KEY).update(message).digest("base64");
}

export function buildPaymentForm({ amount, transactionUuid, successUrl, failureUrl }) {
  const signedFieldNames = ["total_amount", "transaction_uuid", "product_code"];
  const fields = {
    amount,
    tax_amount: 0,
    total_amount: amount,
    transaction_uuid: transactionUuid,
    product_code: PRODUCT_CODE,
    product_service_charge: 0,
    product_delivery_charge: 0,
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: signedFieldNames.join(","),
  };
  fields.signature = sign(fields, signedFieldNames);
  return { formUrl: FORM_URL, fields };
}

export async function checkStatus({ transactionUuid, totalAmount }) {
  const url = `${STATUS_URL}?${new URLSearchParams({
    product_code: PRODUCT_CODE,
    total_amount: totalAmount,
    transaction_uuid: transactionUuid,
  })}`;

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || "eSewa status check failed");
    err.status = 502;
    err.raw = data;
    throw err;
  }
  return data;
}
