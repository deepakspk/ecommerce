import ProductVariant from "../../models/ProductVariant.js";
import InventoryLog from "../../models/InventoryLog.js";
import StockAlert from "../../models/StockAlert.js";
import Product from "../../models/Product.js";
import { sendBackInStockEmail } from "../../utils/orderEmails.js";
import { logAudit } from "../../utils/auditLog.js";

async function notifyStockAlerts(variant) {
  const alerts = await StockAlert.find({ variantId: variant._id, notifiedAt: null }).populate("userId", "email");
  if (alerts.length === 0) return;

  const product = await Product.findById(variant.productId).select("name");
  const productName = product?.name || "Item";

  for (const alert of alerts) {
    sendBackInStockEmail(variant, productName, alert.userId?.email);
    alert.notifiedAt = new Date();
    await alert.save();
  }
}

const LOW_STOCK_THRESHOLD = 5;

const SORT_OPTIONS = {
  stock_asc: "stockQuantity",
  stock_desc: "-stockQuantity",
};

export async function listInventory(req, res) {
  const { search, stockStatus, sort, page = 1, limit = 10 } = req.query;
  const filter = {};

  if (search?.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const matchingProducts = await Product.find({ name: re }).select("_id");
    filter.$or = [{ sku: re }, { productId: { $in: matchingProducts.map((p) => p._id) } }];
  }
  if (stockStatus === "low") filter.stockQuantity = { $lt: LOW_STOCK_THRESHOLD, $gt: 0 };
  if (stockStatus === "out") filter.stockQuantity = 0;
  if (stockStatus === "in") filter.stockQuantity = { $gte: LOW_STOCK_THRESHOLD };

  const skip = (Number(page) - 1) * Number(limit);
  const [variants, total, lowCount] = await Promise.all([
    ProductVariant.find(filter)
      .populate({ path: "productId", select: "name isActive" })
      .sort(SORT_OPTIONS[sort] || SORT_OPTIONS.stock_asc)
      .skip(skip)
      .limit(Number(limit)),
    ProductVariant.countDocuments(filter),
    ProductVariant.countDocuments({ stockQuantity: { $lt: LOW_STOCK_THRESHOLD } }),
  ]);

  res.json({ variants, total, page: Number(page), pages: Math.ceil(total / Number(limit)), lowCount });
}

export async function adjustStock(req, res) {
  const { change, reason } = req.body;
  if (change === undefined || change === null || change === "") {
    return res.status(400).json({ message: "change is required" });
  }
  if (!reason?.trim()) return res.status(400).json({ message: "reason is required" });

  const variant = await ProductVariant.findById(req.params.variantId);
  if (!variant) return res.status(404).json({ message: "Variant not found" });

  const delta = Number(change);
  if (isNaN(delta) || delta === 0) return res.status(400).json({ message: "change must be a non-zero number" });

  const previousStock = variant.stockQuantity;
  const newStock = previousStock + delta;
  if (newStock < 0) return res.status(400).json({ message: "Stock cannot go negative" });

  variant.stockQuantity = newStock;
  await variant.save();
  await InventoryLog.create({ variantId: variant._id, change: delta, reason: reason.trim() });

  logAudit({
    adminUserId: req.user._id,
    action: "STOCK_ADJUSTMENT",
    targetType: "ProductVariant",
    targetId: variant._id,
    meta: { change: delta, reason: reason.trim(), previousStock, newStock },
  });

  if (previousStock === 0 && newStock > 0) await notifyStockAlerts(variant);

  res.json({ variant });
}

export async function listLogs(req, res) {
  const logs = await InventoryLog.find({ variantId: req.params.variantId })
    .sort("-createdAt")
    .limit(50);
  res.json({ logs });
}
