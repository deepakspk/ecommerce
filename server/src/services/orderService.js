import mongoose from "mongoose";
import Order from "../models/Order.js";
import ProductVariant from "../models/ProductVariant.js";
import InventoryLog from "../models/InventoryLog.js";
import { validateCoupon, redeemCoupon } from "./couponService.js";
import { resolveDeliveryFee } from "./deliveryFeeService.js";
import { sendOrderConfirmedEmail } from "../utils/orderEmails.js";

// Shared core of order creation used by both customer checkout and admin
// manual order creation — keeps stock-checking, coupon redemption, and the
// transaction boundary in one place so the two flows can't drift apart.
export async function placeOrder({ userId, items, address, paymentMethod, couponCode, source = "CUSTOMER", customerEmail }) {
  if (!items?.length) {
    const err = new Error("Order must contain at least one item");
    err.status = 400;
    throw err;
  }

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = await resolveDeliveryFee(address);

  const session = await mongoose.startSession();
  let order;

  try {
    session.startTransaction();

    for (const item of items) {
      const variant = await ProductVariant.findById(item.variantId).session(session);
      if (!variant || variant.stockQuantity < item.quantity) {
        const err = new Error(`${item.productName} (${item.size}/${item.color}) has insufficient stock`);
        err.status = 400;
        throw err;
      }
    }

    let discountAmount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const result = await validateCoupon({ code: couponCode, subtotal, userId, session });
      appliedCoupon = result.coupon;
      discountAmount = result.discountAmount;
    }
    const total = Math.max(0, subtotal - discountAmount + deliveryFee);

    [order] = await Order.create(
      [{
        userId,
        address,
        items,
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

    const inventoryReason = source === "ADMIN_MANUAL" ? `Manual order ${order._id} created by admin` : `Order ${order._id}`;
    for (const item of items) {
      await ProductVariant.findByIdAndUpdate(
        item.variantId,
        { $inc: { stockQuantity: -item.quantity } },
        { session }
      );
      await InventoryLog.create(
        [{ variantId: item.variantId, change: -item.quantity, reason: inventoryReason }],
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

  if (customerEmail) sendOrderConfirmedEmail(order, customerEmail);

  return order;
}
