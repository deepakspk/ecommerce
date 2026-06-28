// Mirrors server/src/utils/pricing.js so the discount shown to shoppers always
// matches what they'll actually be charged at checkout.
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
