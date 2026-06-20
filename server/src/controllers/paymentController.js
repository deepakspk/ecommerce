import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import * as khalti from "../config/khalti.js";
import * as esewa from "../config/esewa.js";
import { sendPaymentFailedEmail } from "../utils/orderEmails.js";
import * as settingsService from "../services/settingsService.js";

const FAILED_STATUSES = ["Expired", "User canceled"];
const ESEWA_FAILED_STATUSES = ["CANCELED", "NOT_FOUND"];
const ESEWA_REFUND_STATUSES = ["FULL_REFUND", "PARTIAL_REFUND"];

export async function initiateKhalti(req, res) {
  const { orderId } = req.body;

  const order = await Order.findOne({ _id: orderId, userId: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.paymentMethod !== "KHALTI") {
    return res.status(400).json({ message: "This order is not set up for Khalti payment" });
  }
  if (order.paymentStatus === "PAID") {
    return res.status(400).json({ message: "Order is already paid" });
  }

  const frontendUrl = settingsService.get("FRONTEND_URL");
  const result = await khalti.initiatePayment({
    return_url: `${frontendUrl}/payment/khalti/callback`,
    website_url: frontendUrl,
    amount: Math.round(order.total * 100),
    purchase_order_id: String(order._id),
    purchase_order_name: `Order ${order._id}`,
    customer_info: {
      name: order.address.recipientName,
      phone: order.address.phone,
    },
  });

  await Payment.create({
    orderId: order._id,
    gateway: "KHALTI",
    amount: order.total,
    gatewayRef: result.pidx,
    status: "PENDING",
    rawResponse: result,
  });

  res.json({ paymentUrl: result.payment_url, pidx: result.pidx });
}

export async function verifyKhalti(req, res) {
  const { pidx } = req.body;

  const payment = await Payment.findOne({ gatewayRef: pidx, gateway: "KHALTI" });
  if (!payment) return res.status(404).json({ message: "Payment not found" });

  const order = await Order.findOne({ _id: payment.orderId, userId: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });

  const result = await khalti.lookupPayment(pidx);
  payment.rawResponse = result;

  if (result.status === "Completed") {
    payment.status = "PAID";
    payment.transactionId = result.transaction_id;
    order.paymentStatus = "PAID";
  } else if (result.status === "Refunded") {
    payment.status = "REFUNDED";
    order.paymentStatus = "REFUNDED";
  } else if (FAILED_STATUSES.includes(result.status)) {
    payment.status = "FAILED";
    order.paymentStatus = "FAILED";
  }
  // "Pending" / "Initiated" — leave both as PENDING, caller can poll again later

  await payment.save();
  await order.save();

  if (order.paymentStatus === "FAILED") sendPaymentFailedEmail(order, req.user.email);

  res.json({ status: result.status, order });
}

export async function initiateEsewa(req, res) {
  const { orderId } = req.body;

  const order = await Order.findOne({ _id: orderId, userId: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.paymentMethod !== "ESEWA") {
    return res.status(400).json({ message: "This order is not set up for eSewa payment" });
  }
  if (order.paymentStatus === "PAID") {
    return res.status(400).json({ message: "Order is already paid" });
  }

  const transactionUuid = `${order._id}-${Date.now()}`;
  const frontendUrl = settingsService.get("FRONTEND_URL");
  const successUrl = settingsService.get("ESEWA_SUCCESS_URL") || `${frontendUrl}/payment/esewa/callback`;
  const failureUrlBase = settingsService.get("ESEWA_FAILURE_URL") || `${frontendUrl}/payment/esewa/callback`;
  const { formUrl, fields } = esewa.buildPaymentForm({
    amount: order.total,
    transactionUuid,
    successUrl,
    failureUrl: `${failureUrlBase}?status=failure&transaction_uuid=${transactionUuid}`,
  });

  await Payment.create({
    orderId: order._id,
    gateway: "ESEWA",
    amount: order.total,
    gatewayRef: transactionUuid,
    status: "PENDING",
    rawResponse: fields,
  });

  res.json({ formUrl, fields });
}

export async function verifyEsewa(req, res) {
  const { transactionUuid } = req.body;

  const payment = await Payment.findOne({ gatewayRef: transactionUuid, gateway: "ESEWA" });
  if (!payment) return res.status(404).json({ message: "Payment not found" });

  const order = await Order.findOne({ _id: payment.orderId, userId: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });

  const result = await esewa.checkStatus({ transactionUuid, totalAmount: payment.amount });
  payment.rawResponse = result;

  if (result.status === "COMPLETE") {
    payment.status = "PAID";
    payment.transactionId = result.ref_id;
    order.paymentStatus = "PAID";
  } else if (ESEWA_REFUND_STATUSES.includes(result.status)) {
    payment.status = "REFUNDED";
    order.paymentStatus = "REFUNDED";
  } else if (ESEWA_FAILED_STATUSES.includes(result.status)) {
    payment.status = "FAILED";
    order.paymentStatus = "FAILED";
  }
  // "PENDING" / "AMBIGUOUS" — leave both as PENDING, caller can poll again later

  await payment.save();
  await order.save();

  if (order.paymentStatus === "FAILED") sendPaymentFailedEmail(order, req.user.email);

  res.json({ status: result.status, order });
}
