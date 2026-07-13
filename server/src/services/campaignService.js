import Campaign from "../models/Campaign.js";

// Filter matching campaigns that are live on the storefront right now:
// admin-enabled, not cancelled, and currently inside their date window.
export function runningCampaignFilter(now = new Date()) {
  return {
    isActive: true,
    isCancelled: false,
    startDate: { $lte: now },
    endDate: { $gte: now },
  };
}

// Map of productId (string) -> lowest special price across all running
// campaigns. This is what makes campaign pricing real: product listings, the
// cart, and checkout all consult it, so the shopper is charged exactly the
// price the campaign advertised. Products listed in a campaign without a
// special price simply aren't in the map (they sell at their regular price).
export async function getCampaignPriceMap(productIds) {
  if (!productIds?.length) return new Map();

  const campaigns = await Campaign.find({
    ...runningCampaignFilter(),
    "products.product": { $in: productIds },
  }).select("products");

  const wanted = new Set(productIds.map(String));
  const map = new Map();
  for (const campaign of campaigns) {
    for (const item of campaign.products) {
      if (item.specialPrice == null) continue;
      const key = String(item.product);
      if (!wanted.has(key)) continue;
      const existing = map.get(key);
      if (existing === undefined || item.specialPrice < existing) {
        map.set(key, item.specialPrice);
      }
    }
  }
  return map;
}
