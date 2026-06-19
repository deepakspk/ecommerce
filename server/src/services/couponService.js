import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function computeDiscount(coupon, subtotal) {
  let discount = coupon.type === "PERCENTAGE" ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscountAmount != null) discount = Math.min(discount, coupon.maxDiscountAmount);
  discount = Math.min(discount, subtotal);
  return Math.round(discount * 100) / 100;
}

// Re-run on both the cart preview and inside the order transaction — a coupon can
// expire, hit its usage limit, or hit a per-user limit between the two.
export async function validateCoupon({ code, subtotal, userId, session }) {
  if (!code?.trim()) throw new HttpError(400, "Coupon code is required");

  const couponQuery = Coupon.findOne({ code: code.trim().toUpperCase() });
  if (session) couponQuery.session(session);
  const coupon = await couponQuery;
  if (!coupon) throw new HttpError(404, "Invalid coupon code");
  if (!coupon.isActive) throw new HttpError(400, "This coupon is no longer active");

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) throw new HttpError(400, "This coupon is not active yet");
  if (coupon.expiresAt && now > coupon.expiresAt) throw new HttpError(400, "This coupon has expired");

  if (subtotal < coupon.minOrderValue) {
    throw new HttpError(400, `This coupon requires a minimum order of Rs. ${coupon.minOrderValue}`);
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new HttpError(400, "This coupon has reached its usage limit");
  }

  if (coupon.perUserLimit != null && userId) {
    const usedByUserQuery = Order.countDocuments({ userId, couponCode: coupon.code });
    if (session) usedByUserQuery.session(session);
    const usedByUser = await usedByUserQuery;
    if (usedByUser >= coupon.perUserLimit) {
      throw new HttpError(400, "You have already used this coupon the maximum number of times");
    }
  }

  const discountAmount = computeDiscount(coupon, subtotal);
  return { coupon, discountAmount };
}

export async function redeemCoupon(coupon, session) {
  await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } }, { session });
}
