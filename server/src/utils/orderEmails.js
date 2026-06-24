import { sendEmail } from "./sendEmail.js";

function fireAndForget(promise, label) {
  promise.catch((err) => console.error(`[email] failed to send ${label}:`, err.message));
}

export function sendOrderConfirmedEmail(order, email) {
  if (!email) return;
  fireAndForget(
    sendEmail({
      to: email,
      subject: `Order confirmed — #${order._id}`,
      html: `<p>Thanks for your order! Your order <strong>#${order._id}</strong> totalling Rs. ${order.total} has been received and is being processed.</p>`,
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
      html: `<p>Your order <strong>#${order._id}</strong> has been ${statusText}.</p>`,
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
