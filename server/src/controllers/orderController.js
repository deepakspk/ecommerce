import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Address from "../models/Address.js";
import ProductVariant from "../models/ProductVariant.js";
import InventoryLog from "../models/InventoryLog.js";
import { validateCoupon, redeemCoupon } from "../services/couponService.js";

function calcDeliveryFee(province) {
  return province.toLowerCase().trim() === "bagmati" ? 100 : 200;
}

export async function createOrder(req, res) {
  const { addressId, paymentMethod = "COD", couponCode } = req.body;
  if (!addressId) return res.status(400).json({ message: "addressId is required" });
  if (!["COD", "KHALTI", "ESEWA"].includes(paymentMethod)) {
    return res.status(400).json({ message: "Invalid paymentMethod" });
  }

  const cart = await Cart.findOne({ userId: req.user._id }).populate({
    path: "items.variantId",
    populate: { path: "productId", select: "name basePrice" },
  });

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: "Your cart is empty" });
  }

  const address = await Address.findOne({ _id: addressId, userId: req.user._id });
  if (!address) return res.status(404).json({ message: "Address not found" });

  const orderItems = [];
  let subtotal = 0;

  for (const cartItem of cart.items) {
    const v = cartItem.variantId;
    const p = v.productId;
    const unitPrice = v.price ?? p.basePrice;
    orderItems.push({
      variantId: v._id,
      productName: p.name,
      size: v.size,
      color: v.color,
      unitPrice,
      quantity: cartItem.quantity,
    });
    subtotal += unitPrice * cartItem.quantity;
  }

  const deliveryFee = calcDeliveryFee(address.province);

  const addressSnapshot = {
    recipientName: address.recipientName,
    phone: address.phone,
    province: address.province,
    district: address.district,
    city: address.city,
    area: address.area,
    street: address.street,
    landmark: address.landmark,
  };

  const session = await mongoose.startSession();
  let order;

  try {
    session.startTransaction();

    for (const item of orderItems) {
      const variant = await ProductVariant.findById(item.variantId).session(session);
      if (!variant || variant.stockQuantity < item.quantity) {
        const err = new Error(`${item.productName} (${item.size}/${item.color}) has insufficient stock`);
        err.status = 400;
        throw err;
      }
    }

    // Re-validate the coupon here (not just at preview time) — it could have expired
    // or hit its usage limit between the cart preview and this checkout request.
    let discountAmount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const result = await validateCoupon({ code: couponCode, subtotal, userId: req.user._id, session });
      appliedCoupon = result.coupon;
      discountAmount = result.discountAmount;
    }
    const total = subtotal - discountAmount + deliveryFee;

    [order] = await Order.create(
      [{
        userId: req.user._id,
        address: addressSnapshot,
        items: orderItems,
        subtotal,
        discountAmount,
        couponCode: appliedCoupon?.code || null,
        deliveryFee,
        total,
        paymentMethod,
        paymentStatus: "PENDING",
        status: "PENDING",
      }],
      { session }
    );

    for (const item of orderItems) {
      await ProductVariant.findByIdAndUpdate(
        item.variantId,
        { $inc: { stockQuantity: -item.quantity } },
        { session }
      );
      await InventoryLog.create(
        [{ variantId: item.variantId, change: -item.quantity, reason: `Order ${order._id}` }],
        { session }
      );
    }

    if (appliedCoupon) {
      await redeemCoupon(appliedCoupon, session);
    }

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }

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
