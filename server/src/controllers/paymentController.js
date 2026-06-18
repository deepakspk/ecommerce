import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import * as khalti from "../config/khalti.js";

const FAILED_STATUSES = ["Expired", "User canceled"];

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

  const result = await khalti.initiatePayment({
    return_url: `${process.env.CLIENT_URL}/payment/khalti/callback`,
    website_url: process.env.CLIENT_URL,
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

  res.json({ status: result.status, order });
}
