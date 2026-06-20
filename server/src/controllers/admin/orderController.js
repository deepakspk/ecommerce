import Order from "../../models/Order.js";
import ProductVariant from "../../models/ProductVariant.js";
import User from "../../models/User.js";
import { sendOrderStatusEmail } from "../../utils/orderEmails.js";
import { logAudit } from "../../utils/auditLog.js";
import { streamInvoicePdf } from "../../utils/invoice.js";

const STATUS_TRANSITIONS = {
  PENDING:   ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED",    "CANCELLED"],
  PACKED:    ["SHIPPED",   "CANCELLED"],
  SHIPPED:   ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export async function getDashboardStats(req, res) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [salesAgg, todayOrders, pendingOrders, lowStockCount] = await Promise.all([
    Order.aggregate([
      { $match: { status: { $ne: "CANCELLED" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Order.countDocuments({ status: "PENDING" }),
    ProductVariant.countDocuments({ stockQuantity: { $lt: 5 } }),
  ]);

  res.json({
    totalSales: salesAgg[0]?.total ?? 0,
    todayOrders,
    pendingOrders,
    lowStockCount,
  });
}

export async function listOrders(req, res) {
  const { status, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("userId", "name email phone")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(filter),
  ]);

  res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function getOrder(req, res) {
  const order = await Order.findById(req.params.id).populate("userId", "name email phone");
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
}

export async function downloadInvoice(req, res) {
  const order = await Order.findById(req.params.id).populate("userId", "name email");
  if (!order) return res.status(404).json({ message: "Order not found" });
  streamInvoicePdf(res, order, { name: order.userId?.name, email: order.userId?.email });
}

const LOCKED_STATUSES = ["DELIVERED", "CANCELLED"];

export async function updateOrder(req, res) {
  const { items, address, customer } = req.body;
  const order = await Order.findById(req.params.id).populate("userId", "name email phone");
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (LOCKED_STATUSES.includes(order.status)) {
    return res.status(400).json({ message: `Cannot edit an order that is ${order.status}` });
  }

  if (items) {
    order.items = items.map((item) => ({
      variantId: item.variantId,
      productName: item.productName,
      size: item.size,
      color: item.color,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    }));
    order.subtotal = order.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    order.total = Math.max(0, order.subtotal - order.discountAmount + order.deliveryFee);
  }

  if (address) {
    order.address = { ...order.address.toObject(), ...address };
  }

  if (customer && order.userId) {
    const user = await User.findById(order.userId._id);
    if (customer.name !== undefined) user.name = customer.name;
    if (customer.email !== undefined) user.email = customer.email;
    if (customer.phone !== undefined) user.phone = customer.phone;
    try {
      await user.save();
    } catch (e) {
      if (e.code === 11000) {
        const field = Object.keys(e.keyPattern || {})[0] || "field";
        return res.status(400).json({ message: `That ${field} is already in use by another account` });
      }
      throw e;
    }
  }

  await order.save();
  const updated = await Order.findById(order._id).populate("userId", "name email phone");
  res.json({ order: updated });
}

export async function updateStatus(req, res) {
  const { status } = req.body;
  const order = await Order.findById(req.params.id).populate("userId", "name email phone");
  if (!order) return res.status(404).json({ message: "Order not found" });

  const allowed = STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      message: `Cannot move from ${order.status} to ${status}. Allowed next: ${allowed.join(", ") || "none"}`,
    });
  }

  const previousStatus = order.status;
  order.status = status;
  if (status === "DELIVERED" && !order.deliveredAt) order.deliveredAt = new Date();
  await order.save();

  logAudit({
    adminUserId: req.user._id,
    action: "ORDER_STATUS_CHANGE",
    targetType: "Order",
    targetId: order._id,
    meta: { previousStatus, newStatus: status },
  });

  sendOrderStatusEmail(order, order.userId?.email, status);

  res.json({ order });
}

export async function markPaid(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.paymentStatus === "PAID") {
    return res.status(400).json({ message: "Order is already marked as paid" });
  }
  order.paymentStatus = "PAID";
  await order.save();
  res.json({ order });
}
