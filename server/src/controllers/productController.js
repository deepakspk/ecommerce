import Category from "../models/Category.js";
import Product from "../models/Product.js";
import ProductVariant from "../models/ProductVariant.js";
import Review from "../models/Review.js";
import { getDescendantIds } from "../services/categoryService.js";
import { getDiscountedPrice } from "../utils/pricing.js";

function attachPricing(products) {
  return products.map((p) => ({ ...p, ...getDiscountedPrice(p.basePrice, p) }));
}

async function attachRatings(products) {
  const ids = products.map((p) => p._id);
  const agg = await Review.aggregate([
    { $match: { productId: { $in: ids } } },
    { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const byId = new Map(agg.map((r) => [String(r._id), r]));

  return products.map((p) => {
    const stats = byId.get(String(p._id));
    return {
      ...p.toObject(),
      averageRating: stats ? Math.round(stats.avg * 10) / 10 : 0,
      reviewCount: stats ? stats.count : 0,
    };
  });
}

// Lets the storefront know whether "Add to Cart" can safely auto-pick a variant
// (0 or 1 total variants) or must send the shopper to the product page to choose.
async function attachVariantCounts(products) {
  const ids = products.map((p) => p._id);
  const agg = await ProductVariant.aggregate([
    { $match: { productId: { $in: ids } } },
    { $group: { _id: "$productId", count: { $sum: 1 } } },
  ]);
  const byId = new Map(agg.map((r) => [String(r._id), r.count]));
  return products.map((p) => ({ ...p, variantCount: byId.get(String(p._id)) || 0 }));
}

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  "price-asc": { basePrice: 1 },
  "price-desc": { basePrice: -1 },
};

export async function getAvailableFilters(req, res) {
  const [sizes, colors, priceRange] = await Promise.all([
    ProductVariant.distinct("size"),
    ProductVariant.distinct("color"),
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, min: { $min: "$basePrice" }, max: { $max: "$basePrice" } } },
    ]),
  ]);

  const range = priceRange[0] || { min: 0, max: 0 };
  res.json({
    sizes: sizes.sort(),
    colors: colors.sort(),
    priceMin: range.min,
    priceMax: range.max,
  });
}

export async function listProducts(req, res) {
  const { category, search, size, color, minPrice, maxPrice, sort, page = 1, limit = 20 } = req.query;

  const filter = { isActive: true };

  if (category) {
    const cat = await Category.findOne({ slug: category.toLowerCase() });
    if (!cat) return res.json({ products: [], total: 0, page: 1, pages: 0 });
    const descendantIds = await getDescendantIds(cat._id);
    filter.categories = { $in: [cat._id, ...descendantIds] };
  }

  if (search) {
    const rx = { $regex: search, $options: "i" };
    filter.$or = [{ name: rx }, { description: rx }];
  }

  if (minPrice !== undefined && minPrice !== "") {
    filter.basePrice = { ...filter.basePrice, $gte: Number(minPrice) };
  }
  if (maxPrice !== undefined && maxPrice !== "") {
    filter.basePrice = { ...filter.basePrice, $lte: Number(maxPrice) };
  }

  if (size || color) {
    const variantFilter = {};
    if (size) variantFilter.size = { $regex: `^${escapeRegex(size)}$`, $options: "i" };
    if (color) variantFilter.color = { $regex: `^${escapeRegex(color)}$`, $options: "i" };
    const productIds = await ProductVariant.find(variantFilter).distinct("productId");
    filter._id = { $in: productIds };
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("categories", "name slug")
      .sort(SORT_OPTIONS[sort] || SORT_OPTIONS.newest)
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  const withRatings = await attachRatings(products);
  res.json({
    products: attachPricing(await attachVariantCounts(withRatings)),
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
}

export async function getProduct(req, res) {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate(
    "categories",
    "name slug"
  );
  if (!product) return res.status(404).json({ message: "Product not found" });

  const variants = await ProductVariant.find({ productId: product._id }).sort({ size: 1, color: 1 });
  const [withRating] = attachPricing(await attachRatings([product]));

  async function inStockOnly(candidates) {
    if (candidates.length === 0) return [];
    const ids = (
      await ProductVariant.find({
        productId: { $in: candidates.map((p) => p._id) },
        stockQuantity: { $gt: 0 },
      }).distinct("productId")
    ).map(String);
    const idSet = new Set(ids);
    return candidates.filter((p) => idSet.has(String(p._id)));
  }

  const RELATED_LIMIT = 8;
  const sameCategoryProducts = await Product.find({
    _id: { $ne: product._id },
    categories: { $in: product.categories.map((c) => c._id) },
    isActive: true,
  }).populate("categories", "name slug");

  let related = await inStockOnly(sameCategoryProducts);

  // Same-category pool is thin (a niche subcategory, or most of it out of stock) —
  // top up with other in-stock active products so the rail isn't sparse/empty.
  if (related.length < 4) {
    const excludeIds = [product._id, ...related.map((p) => p._id)];
    const fallbackCandidates = await Product.find({
      _id: { $nin: excludeIds },
      isActive: true,
    })
      .populate("categories", "name slug")
      .sort({ createdAt: -1 })
      .limit(RELATED_LIMIT * 2);
    const fallbackInStock = await inStockOnly(fallbackCandidates);
    related = [...related, ...fallbackInStock.slice(0, RELATED_LIMIT - related.length)];
  }

  const relatedProducts = attachPricing(await attachRatings(related.slice(0, RELATED_LIMIT)));

  res.json({ product: withRating, variants, relatedProducts });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
