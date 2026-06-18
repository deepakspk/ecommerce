import Review from "../models/Review.js";
import Order from "../models/Order.js";
import ProductVariant from "../models/ProductVariant.js";

// Finds a DELIVERED order belonging to userId that contains the given product
// (orders only store variantId, so we resolve the product's variant ids first).
async function findDeliveredOrder(userId, productId) {
  const variantIds = await ProductVariant.find({ productId }).distinct("_id");
  if (variantIds.length === 0) return null;
  return Order.findOne({
    userId,
    status: "DELIVERED",
    "items.variantId": { $in: variantIds },
  }).select("_id");
}

export async function getReviews(req, res) {
  const { productId } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({ productId })
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ productId }),
  ]);

  res.json({ reviews, total, page, pages: Math.ceil(total / limit) });
}

export async function getEligibility(req, res) {
  const { productId } = req.params;

  const [order, existingReview] = await Promise.all([
    findDeliveredOrder(req.user._id, productId),
    Review.findOne({ productId, userId: req.user._id }),
  ]);

  res.json({
    hasPurchased: !!order,
    alreadyReviewed: !!existingReview,
    existingReview: existingReview || null,
  });
}

export async function createReview(req, res) {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  const order = await findDeliveredOrder(req.user._id, productId);
  if (!order) {
    return res.status(403).json({ message: "You can only review products from a delivered order" });
  }

  const review = await Review.findOneAndUpdate(
    { productId, userId: req.user._id },
    { rating, comment, orderId: order._id, isVerifiedPurchase: true },
    { upsert: true, new: true }
  );

  res.json({ review });
}
