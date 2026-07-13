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

// Campaign-aware pricing: a running campaign's special price wins only when it
// beats the regular (discounted) price, so a shopper never pays more because a
// product joined a campaign. Mirrored in client/src/utils/pricing.js.
export function getEffectivePricing(price, product = {}, campaignPrice = product.campaignPrice) {
  const pricing = getDiscountedPrice(price, product);
  if (campaignPrice != null && campaignPrice < pricing.finalPrice) {
    return {
      finalPrice: campaignPrice,
      discountPercent: price > 0 ? Math.round(((price - campaignPrice) / price) * 100) : 0,
      hasDiscount: campaignPrice < price,
      isCampaignPrice: true,
    };
  }
  return { ...pricing, isCampaignPrice: false };
}
