import { sendEmail } from "./sendEmail.js";
import CompanySettings from "../models/CompanySettings.js";
import * as settingsService from "../services/settingsService.js";

function fireAndForget(promise, label) {
  promise.catch((err) => console.error(`[email] failed to send ${label}:`, err.message));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trackingUrl(order) {
  const base = settingsService.get("FRONTEND_URL");
  return order.trackingId && base ? `${base}/track-order?code=${order.trackingId}` : "";
}

function trackingLine(order) {
  if (!order.trackingId) return "";
  const url = trackingUrl(order);
  const id = url
    ? `<a href="${url}" style="color:#2563eb;"><strong>${order.trackingId}</strong></a>`
    : `<strong>${order.trackingId}</strong>`;
  return `<p>Track it anytime with tracking ID ${id} on our Track Order page.</p>`;
}

const HEAD_CELL = 'style="padding:4px 10px 4px 0;border-bottom:2px solid #cbd5e1;"';
const CELL = 'style="padding:4px 10px 4px 0;border-bottom:1px solid #e2e8f0;"';

function orderItemsTable(order) {
  const rows = order.items
    .map((item) => {
      const variant = [item.size, item.color].filter(Boolean).join("/");
      return `<tr>
        <td ${CELL}>${escapeHtml(item.productName)}${variant ? ` <span style="color:#64748b;">(${escapeHtml(variant)})</span>` : ""}</td>
        <td ${CELL} align="center">${item.quantity}</td>
        <td ${CELL} align="right">Rs. ${item.unitPrice}</td>
        <td ${CELL} align="right">Rs. ${item.unitPrice * item.quantity}</td>
      </tr>`;
    })
    .join("");

  return `<table style="font-size:13px;border-collapse:collapse;width:100%;">
    <tr>
      <th style="text-align:left;padding:4px 10px 4px 0;border-bottom:2px solid #cbd5e1;">Item</th>
      <th ${HEAD_CELL}>Qty</th>
      <th style="text-align:right;padding:4px 10px 4px 0;border-bottom:2px solid #cbd5e1;">Price</th>
      <th style="text-align:right;padding:4px 10px 4px 0;border-bottom:2px solid #cbd5e1;">Total</th>
    </tr>
    ${rows}
  </table>`;
}

function orderTotalsBlock(order) {
  return `<p style="margin-top:10px;">
    Subtotal: Rs. ${order.subtotal}<br />
    ${order.discountAmount ? `Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ""}: −Rs. ${order.discountAmount}<br />` : ""}
    Delivery charge: Rs. ${order.deliveryFee}<br />
    <strong>Total: Rs. ${order.total}</strong> · ${order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod === "KHALTI" ? "Khalti" : order.paymentMethod === "ESEWA" ? "eSewa" : order.paymentMethod}
  </p>`;
}

export function sendOrderConfirmedEmail(order, email) {
  if (!email) return;

  const url = trackingUrl(order);
  const name = order.address?.recipientName;
  const trackingBlock = order.trackingId
    ? `<div style="margin-top:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#64748b;">Your tracking ID</p>
        <p style="margin:4px 0 10px;font-size:18px;letter-spacing:2px;"><strong>${order.trackingId}</strong></p>
        ${url ? `<a href="${url}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:9px 22px;border-radius:6px;font-size:13px;font-weight:600;">Track your order</a>` : ""}
      </div>`
    : "";

  fireAndForget(
    sendEmail({
      to: email,
      subject: `Order confirmed — #${order._id} · Rs. ${order.total}`,
      html: `<p>Hi${name ? ` ${escapeHtml(name)}` : ""},</p>
        <p>Thanks for your order! Order <strong>#${order._id}</strong> has been received and is being processed. Here's your summary:</p>
        ${orderItemsTable(order)}
        ${orderTotalsBlock(order)}
        ${order.paymentMethod === "COD" ? `<p>Please keep <strong>Rs. ${order.total}</strong> ready — you pay when your order arrives.</p>` : ""}
        ${trackingBlock}
        <p style="margin-top:14px;">You can also see this order anytime under <strong>My Orders</strong> in your account.</p>`,
    }),
    `order-confirmed:${order._id}`
  );
}

export function sendPaymentFailedEmail(order, email) {
  if (!email) return;
  fireAndForget(
    sendEmail({
      to: email,
      subject: `Payment failed — order #${order._id}`,
      html: `<p>We couldn't confirm your payment for order <strong>#${order._id}</strong>. Please try again or choose a different payment method.</p>`,
    }),
    `payment-failed:${order._id}`
  );
}

const ORDER_STATUS_TEXT = {
  PICKED: "picked up by the courier",
  SHIPPED: "shipped",
  ARRIVED: "received at a branch near you",
  OUT_FOR_DELIVERY: "sent out for delivery",
  DELIVERED: "delivered",
};

export function sendOrderStatusEmail(order, email, status) {
  const statusText = ORDER_STATUS_TEXT[status];
  if (!email || !statusText) return;
  fireAndForget(
    sendEmail({
      to: email,
      subject: `Order #${order._id} ${statusText}`,
      html: `<p>Your order <strong>#${order._id}</strong> has been ${statusText}.</p>${trackingLine(order)}`,
    }),
    `order-${status}:${order._id}`
  );
}

const RETURN_STATUS_TEXT = { APPROVED: "approved", REJECTED: "rejected" };

export function sendReturnStatusEmail(returnRequest, email, status) {
  const statusText = RETURN_STATUS_TEXT[status];
  if (!email || !statusText) return;
  fireAndForget(
    sendEmail({
      to: email,
      subject: `Return request ${statusText}`,
      html: `<p>Your return request for order <strong>#${returnRequest.orderId}</strong> has been ${statusText}.</p>`,
    }),
    `return-${status}:${returnRequest._id}`
  );
}

// Notifies the store's own inbox (Company Settings email) when a customer
// places an order, with an itemized summary so staff can act without opening
// the admin panel.
export function sendNewOrderAdminEmail(order, customerEmail) {
  fireAndForget(
    (async () => {
      const company = await CompanySettings.findOne().lean();
      const inbox = company?.email || settingsService.get("EMAIL_FROM_ADDRESS");
      if (!inbox) return;

      const a = order.address || {};
      const addressLine = [a.recipientName, a.street, a.area, a.city, a.district, a.province, a.country]
        .filter(Boolean)
        .map(escapeHtml)
        .join(", ");

      await sendEmail({
        to: inbox,
        replyTo: customerEmail || undefined,
        subject: `New order #${order._id} — Rs. ${order.total} (${order.paymentMethod})`,
        html: `<p>A new order has been placed.</p>
          ${orderItemsTable(order)}
          ${orderTotalsBlock(order)}
          <p>
            <strong>Deliver to:</strong> ${addressLine || "—"}<br />
            ${a.phone ? `<strong>Phone:</strong> ${escapeHtml(a.phone)}<br />` : ""}
            ${customerEmail ? `<strong>Customer email:</strong> ${escapeHtml(customerEmail)}` : ""}
          </p>
          <p>Manage it from the admin Orders page (order ID <strong>${order._id}</strong>).</p>`,
      });
    })(),
    `new-order-admin:${order._id}`
  );
}

export function sendBackInStockEmail(variant, productName, email) {
  if (!email) return;
  fireAndForget(
    sendEmail({
      to: email,
      subject: `Back in stock: ${productName}`,
      html: `<p>Good news! <strong>${productName}</strong> (${variant.size}/${variant.color}) is back in stock.</p>`,
    }),
    `back-in-stock:${variant._id}`
  );
}
