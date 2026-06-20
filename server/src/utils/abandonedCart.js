import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import { sendEmail } from "./sendEmail.js";

const ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000;
const REMIND_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export async function checkAbandonedCarts() {
  const now = new Date();
  const abandonedBefore = new Date(now - ABANDONED_AFTER_MS);
  const cooldownBefore = new Date(now - REMIND_COOLDOWN_MS);

  const candidates = await Cart.find({
    userId: { $ne: null },
    "items.0": { $exists: true },
    updatedAt: { $lte: abandonedBefore },
    $or: [{ lastAbandonedEmailSentAt: null }, { lastAbandonedEmailSentAt: { $lte: cooldownBefore } }],
  }).populate("userId", "name email");

  for (const cart of candidates) {
    if (!cart.userId?.email) continue;

    const recentOrder = await Order.exists({
      userId: cart.userId._id,
      createdAt: { $gte: abandonedBefore },
    });
    if (recentOrder) continue;

    try {
      await sendEmail({
        to: cart.userId.email,
        subject: "You left something in your cart",
        html: `<p>Hi ${cart.userId.name || "there"}, you still have ${cart.items.length} item(s) waiting in your cart. Come back and complete your order!</p>`,
      });
      cart.lastAbandonedEmailSentAt = now;
      await cart.save();
    } catch (err) {
      console.error(`[email] failed to send abandoned-cart reminder for cart ${cart._id}:`, err.message);
    }
  }
}
