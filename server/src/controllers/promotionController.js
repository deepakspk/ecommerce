import Promotion from "../models/Promotion.js";

export async function getActivePromotions(req, res) {
  const now = new Date();
  const promotions = await Promotion.find({
    isActive: true,
    visibleFrom: { $lte: now },
    visibleUntil: { $gte: now },
  }).sort("-createdAt");
  res.json({ promotions });
}
