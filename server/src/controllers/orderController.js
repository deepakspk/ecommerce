import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Address from "../models/Address.js";
import ProductVariant from "../models/ProductVariant.js";
import InventoryLog from "../models/InventoryLog.js";
import Shipment from "../models/Shipment.js";
import { placeOrder } from "../services/orderService.js";
import { SHIPMENT_TO_ORDER_STATUS } from "../services/trackingService.js";
import { TRACKING_ID_REGEX } from "../utils/trackingId.js";
import { streamInvoicePdf } from "../utils/invoice.js";
import { getEffectivePricing } from "../utils/pricing.js";
import { getCampaignPriceMap } from "../services/campaignService.js";

export async function createOrder(req, res) {
  const { addressId, paymentMethod, couponCode } = req.body;
  if (!addressId) return res.status(400).json({ message: "addressId is required" });

  const cart = await Cart.findOne({ userId: req.user._id }).populate({
    path: "items.variantId",
    populate: { path: "productId", select: "name basePrice discountType discountValue" },
  });

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: "Your cart is empty" });
  }

  const address = await Address.findOne({ _id: addressId, userId: req.user._id });
  if (!address) return res.status(404).json({ message: "Address not found" });

  const isInternational = Boolean(address.country && address.country !== "Nepal");

  // International orders skip online payment entirely — no gateway works for them yet, so
  // the admin arranges payment out-of-band and marks the order paid manually afterward.
  let finalPaymentMethod;
  if (isInternational) {
    finalPaymentMethod = "MANUAL";
  } else {
    finalPaymentMethod = paymentMethod || "COD";
    if (!["COD", "KHALTI", "ESEWA"].includes(finalPaymentMethod)) {
      return res.status(400).json({ message: "Invalid paymentMethod" });
    }
  }

  // Campaign special prices are re-resolved here (not trusted from the client)
  // so the shopper is charged exactly what the running campaign advertises.
  const campaignPrices = await getCampaignPriceMap(
    cart.items.map((i) => i.variantId.productId._id)
  );

  const orderItems = cart.items.map((cartItem) => {
    const v = cartItem.variantId;
    const p = v.productId;
    const { finalPrice } = getEffectivePricing(
      v.price ?? p.basePrice,
      p,
      campaignPrices.get(String(p._id)) ?? null
    );
    return {
      variantId: v._id,
      productName: p.name,
      size: v.size,
      color: v.color,
      unitPrice: finalPrice,
      quantity: cartItem.quantity,
    };
  });

  const addressSnapshot = {
    recipientName: address.recipientName,
    phone: address.phone,
    country: address.country,
    province: address.province,
    district: address.district,
    city: address.city,
    branchName: address.branchName,
    postalCode: address.postalCode,
    area: address.area,
    street: address.street,
    landmark: address.landmark,
  };

  const order = await placeOrder({
    userId: req.user._id,
    items: orderItems,
    address: addressSnapshot,
    paymentMethod: finalPaymentMethod,
    couponCode,
    source: "CUSTOMER",
    customerEmail: req.user.email,
  });

  await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [] });

  res.status(201).json({ order });
}

export async function listOrders(req, res) {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ orders });
}

export async function getOrder(req, res) {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
}

export async function downloadInvoice(req, res) {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  streamInvoicePdf(res, order, { name: req.user.name, email: req.user.email });
}

// Public (no auth): customers paste the tracking id from their confirmation
// email. Responds with status timeline only — no name, address, items, or
// payment details — since anyone holding the code can call this.
export async function trackOrder(req, res) {
  const code = (req.params.code || "").trim().toUpperCase();
  const notFound = () =>
    res.status(404).json({
      message: "We couldn't find any order for that tracking code. Please check the code and try again.",
    });

  if (!TRACKING_ID_REGEX.test(code)) return notFound();

  const order = await Order.findOne({ trackingId: code });
  if (!order) return notFound();

  const shipment = await Shipment.findOne({ orderId: order._id });

  // One timeline entry per status. Order-level history forms the base; carrier
  // events override matching statuses because they carry descriptions and the
  // carrier's own timestamps. Orders created before statusHistory existed fall
  // back to createdAt/deliveredAt so the timeline is never empty.
  const byStatus = new Map();
  for (const h of order.statusHistory) {
    byStatus.set(h.status, { status: h.status, occurredAt: h.occurredAt, description: null });
  }
  if (!byStatus.has("PENDING")) {
    byStatus.set("PENDING", { status: "PENDING", occurredAt: order.createdAt, description: null });
  }
  for (const e of shipment?.trackingEvents ?? []) {
    const status = SHIPMENT_TO_ORDER_STATUS[e.status] || e.status;
    byStatus.set(status, {
      status,
      occurredAt: e.occurredAt || byStatus.get(status)?.occurredAt || null,
      description: e.description || null,
    });
  }
  if (order.deliveredAt && !byStatus.has("DELIVERED")) {
    byStatus.set("DELIVERED", { status: "DELIVERED", occurredAt: order.deliveredAt, description: null });
  }
  if (!byStatus.has(order.status)) {
    byStatus.set(order.status, { status: order.status, occurredAt: null, description: null });
  }

  const events = [...byStatus.values()].sort((a, b) => {
    if (!a.occurredAt) return 1;
    if (!b.occurredAt) return -1;
    return new Date(a.occurredAt) - new Date(b.occurredAt);
  });

  res.json({
    tracking: {
      trackingId: order.trackingId,
      status: order.status,
      placedAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
      carrier: shipment?.provider || null,
      events,
    },
  });
}

export async function cancelOrder(req, res) {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (!["PENDING", "CONFIRMED"].includes(order.status)) {
    return res.status(400).json({ message: `Order cannot be cancelled once it is ${order.status.toLowerCase()}` });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    for (const item of order.items) {
      await ProductVariant.findByIdAndUpdate(
        item.variantId,
        { $inc: { stockQuantity: item.quantity } },
        { session }
      );
      await InventoryLog.create(
        [{ variantId: item.variantId, change: item.quantity, reason: `Cancelled order ${order._id}` }],
        { session }
      );
    }

    order.status = "CANCELLED";
    order.statusHistory.push({ status: "CANCELLED", occurredAt: new Date() });
    await order.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }

  res.json({ order });
}
