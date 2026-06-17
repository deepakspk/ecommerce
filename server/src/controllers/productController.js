import Category from "../models/Category.js";
import Product from "../models/Product.js";
import ProductVariant from "../models/ProductVariant.js";

export async function listCategories(req, res) {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ categories });
}

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
  const { category, search, size, color, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

  const filter = { isActive: true };

  if (category) {
    const cat = await Category.findOne({ slug: category.toLowerCase() });
    if (!cat) return res.json({ products: [], total: 0, page: 1, pages: 0 });
    filter.categoryId = cat._id;
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
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.json({ products, total, page: pageNum, pages: Math.ceil(total / limitNum) });
}

export async function getProduct(req, res) {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate(
    "categoryId",
    "name slug"
  );
  if (!product) return res.status(404).json({ message: "Product not found" });

  const variants = await ProductVariant.find({ productId: product._id }).sort({ size: 1, color: 1 });
  res.json({ product, variants });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
