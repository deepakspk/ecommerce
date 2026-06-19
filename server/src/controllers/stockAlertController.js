import StockAlert from "../models/StockAlert.js";
import ProductVariant from "../models/ProductVariant.js";

export async function createStockAlert(req, res) {
  const { variantId } = req.body;

  const variant = await ProductVariant.findById(variantId);
  if (!variant) return res.status(404).json({ message: "Variant not found" });

  const existing = await StockAlert.findOne({ userId: req.user._id, variantId, notifiedAt: null });
  if (existing) return res.json({ message: "You're already on the list for this item" });

  await StockAlert.create({ userId: req.user._id, variantId });
  res.status(201).json({ message: "We'll email you when this is back in stock" });
}
