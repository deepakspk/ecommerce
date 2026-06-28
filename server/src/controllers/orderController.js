import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Address from "../models/Address.js";
import ProductVariant from "../models/ProductVariant.js";
import InventoryLog from "../models/InventoryLog.js";
import { placeOrder } from "../services/orderService.js";
import { streamInvoicePdf } from "../utils/invoice.js";
import { getDiscountedPrice } from "../utils/pricing.js";

export async function createOrder(req, res) {
  const { addressId, paymentMethod = "COD", couponCode } = req.body;
  if (!addressId) return res.status(400).json({ message: "addressId is required" });
  if (!["COD", "KHALTI", "ESEWA"].includes(paymentMethod)) {
    return res.status(400).json({ message: "Invalid paymentMethod" });
  }

  const cart = await Cart.findOne({ userId: req.user._id }).populate({
    path: "items.variantId",
    populate: { path: "productId", select: "name basePrice discountType discountValue" },
  });

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: "Your cart is empty" });
  }

  const address = await Address.findOne({ _id: addressId, userId: req.user._id });
  if (!address) return res.status(404).json({ message: "Address not found" });

  const orderItems = cart.items.map((cartItem) => {
    const v = cartItem.variantId;
    const p = v.productId;
    const { finalPrice } = getDiscountedPrice(v.price ?? p.basePrice, p);
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
    province: address.province,
    district: address.district,
    city: address.city,
    branchName: address.branchName,
    area: address.area,
    street: address.street,
    landmark: address.landmark,
  };

  const order = await placeOrder({
    userId: req.user._id,
    items: orderItems,
    address: addressSnapshot,
    paymentMethod,
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
