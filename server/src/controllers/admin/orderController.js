import Order from "../../models/Order.js";
import ProductVariant from "../../models/ProductVariant.js";
import Shipment from "../../models/Shipment.js";
import User from "../../models/User.js";
import { sendOrderStatusEmail } from "../../utils/orderEmails.js";
import { logAudit } from "../../utils/auditLog.js";
import { streamInvoicePdf } from "../../utils/invoice.js";
import { placeOrder } from "../../services/orderService.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STATUS_TRANSITIONS = {
  PENDING:          ["CONFIRMED", "CANCELLED"],
  CONFIRMED:        ["PACKED",    "CANCELLED"],
  PACKED:           ["PICKED",    "CANCELLED"],
  PICKED:           ["SHIPPED",   "CANCELLED"],
  SHIPPED:          ["ARRIVED",   "CANCELLED"],
  ARRIVED:          ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED:        [],
  CANCELLED:        [],
};

export async function listOrders(req, res) {
  const { status, paymentStatus, paymentMethod, search, from, to, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (search?.trim()) {
    // Two round trips (resolve matching customers, then filter orders by their ids) —
    // simplest way to search a populated field without a text index on User.
    const re = new RegExp(escapeRegex(search.trim()), "i");
    const matchingUsers = await User.find({ $or: [{ name: re }, { email: re }, { phone: re }] }).select("_id");
    filter.userId = { $in: matchingUsers.map((u) => u._id) };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("userId", "name email phone")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(filter),
  ]);

  // Lets the orders list show/hide the "create shipment" action — and which courier
  // it shipped with — per row without an extra request per order.
  const shipments = await Shipment.find({ orderId: { $in: orders.map((o) => o._id) } }).select("orderId provider");
  const providerByOrderId = new Map(shipments.map((s) => [String(s.orderId), s.provider]));
  const ordersWithShipment = orders.map((o) => ({
    ...o.toObject(),
    hasShipment: providerByOrderId.has(String(o._id)),
    shipmentProvider: providerByOrderId.get(String(o._id)) || null,
  }));

  res.json({ orders: ordersWithShipment, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
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

export async function createOrderManual(req, res) {
  const { userId, items, address, paymentMethod, couponCode } = req.body;

  const customer = await User.findById(userId);
  if (!customer) return res.status(404).json({ message: "Customer not found" });

  const variantIds = items.map((i) => i.variantId);
  const variants = await ProductVariant.find({ _id: { $in: variantIds } }).populate("productId", "name basePrice");
  const variantsById = new Map(variants.map((v) => [String(v._id), v]));

  const orderItems = [];
  for (const { variantId, quantity } of items) {
    const variant = variantsById.get(String(variantId));
    if (!variant) return res.status(404).json({ message: `Variant ${variantId} not found` });
    const product = variant.productId;
    orderItems.push({
      variantId: variant._id,
      productName: product?.name || "Item",
      size: variant.size,
      color: variant.color,
      unitPrice: variant.price ?? product?.basePrice ?? 0,
      quantity: Number(quantity),
    });
  }

  let order;
  try {
    order = await placeOrder({
      userId: customer._id,
      items: orderItems,
      address,
      paymentMethod,
      couponCode,
      source: "ADMIN_MANUAL",
      customerEmail: customer.email,
    });
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message || "Failed to create order" });
  }

  logAudit({
    adminUserId: req.user._id,
    action: "ORDER_CREATED_MANUAL",
    targetType: "Order",
    targetId: order._id,
    meta: { customerId: customer._id, customerName: customer.name, total: order.total },
  });

  const populated = await Order.findById(order._id).populate("userId", "name email phone");
  res.status(201).json({ order: populated });
}
