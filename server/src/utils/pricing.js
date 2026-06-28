// Mirrors couponService.computeDiscount's shape (PERCENTAGE/FIXED, capped to price)
// but for a per-product discount instead of a cart-level coupon.
export function getDiscountedPrice(price, { discountType, discountValue } = {}) {
  if (!discountType || !discountValue) {
    return { finalPrice: price, discountPercent: 0, hasDiscount: false };
  }

  let discount = discountType === "PERCENTAGE" ? (price * discountValue) / 100 : discountValue;
  discount = Math.min(discount, price);

  const finalPrice = Math.round((price - discount) * 100) / 100;
  const discountPercent = price > 0 ? Math.round((discount / price) * 100) : 0;

  return { finalPrice, discountPercent, hasDiscount: discount > 0 };
}
