import ProductVariant from "../models/ProductVariant.js";
import Review from "../models/Review.js";
import { getEffectivePricing } from "../utils/pricing.js";
import { getCampaignPriceMap } from "./campaignService.js";

// Shared storefront presentation pipeline so product listings, product detail,
// related rails, and campaign pages all expose the same card fields
// (ratings, variantCount, campaignPrice, finalPrice/hasDiscount/discountPercent).

export async function attachRatings(products) {
  const ids = products.map((p) => p._id);
  const agg = await Review.aggregate([
    { $match: { productId: { $in: ids } } },
    { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const byId = new Map(agg.map((r) => [String(r._id), r]));

  return products.map((p) => {
    const stats = byId.get(String(p._id));
    return {
      ...(typeof p.toObject === "function" ? p.toObject() : p),
      averageRating: stats ? Math.round(stats.avg * 10) / 10 : 0,
      reviewCount: stats ? stats.count : 0,
    };
  });
}

// Lets the storefront know whether "Add to Cart" can safely auto-pick a variant
// (0 or 1 total variants) or must send the shopper to the product page to choose.
export async function attachVariantCounts(products) {
  const ids = products.map((p) => p._id);
  const agg = await ProductVariant.aggregate([
    { $match: { productId: { $in: ids } } },
    { $group: { _id: "$productId", count: { $sum: 1 } } },
  ]);
  const byId = new Map(agg.map((r) => [String(r._id), r.count]));
  return products.map((p) => ({ ...p, variantCount: byId.get(String(p._id)) || 0 }));
}

export async function attachPricing(products) {
  const campaignPrices = await getCampaignPriceMap(products.map((p) => p._id));
  return products.map((p) => {
    const campaignPrice = campaignPrices.get(String(p._id)) ?? null;
    return { ...p, campaignPrice, ...getEffectivePricing(p.basePrice, p, campaignPrice) };
  });
}

// Full pipeline: mongoose docs in, storefront-ready plain objects out.
export async function presentProducts(products) {
  return attachPricing(await attachVariantCounts(await attachRatings(products)));
}
