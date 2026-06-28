import Product from "../../models/Product.js";
import ProductVariant from "../../models/ProductVariant.js";
import InventoryLog from "../../models/InventoryLog.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import { logAudit } from "../../utils/auditLog.js";

function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

const SORT_OPTIONS = {
  newest: "-createdAt",
  oldest: "createdAt",
  price_asc: "basePrice",
  price_desc: "-basePrice",
  name_asc: "name",
};

export async function listProducts(req, res) {
  const { search, category, status, minPrice, maxPrice, sort, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (search?.trim()) {
    filter.name = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
  if (category) filter.categories = category;
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;
  if (minPrice || maxPrice) {
    filter.basePrice = {};
    if (minPrice) filter.basePrice.$gte = Number(minPrice);
    if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("categories", "name")
      .sort(SORT_OPTIONS[sort] || SORT_OPTIONS.newest)
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(filter),
  ]);

  res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function getProduct(req, res) {
  const product = await Product.findById(req.params.id).populate("categories", "name");
  if (!product) return res.status(404).json({ message: "Product not found" });
  const variants = await ProductVariant.find({ productId: product._id });
  res.json({ product, variants });
}

function parseCategories(value) {
  const list = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(list) ? list : [];
}

export async function createProduct(req, res) {
  const { name, description, categories, basePrice, discountType, discountValue, isActive, variants } = req.body;

  if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
  const categoryIds = parseCategories(categories);
  if (!categoryIds.length) return res.status(400).json({ message: "At least one category is required" });
  if (basePrice === undefined || basePrice === "") return res.status(400).json({ message: "Base price is required" });

  const slug = slugify(name);
  const existing = await Product.findOne({ slug });
  if (existing) return res.status(409).json({ message: "A product with this name already exists" });

  const images = [];
  if (req.files?.length) {
    for (let i = 0; i < req.files.length; i++) {
      const result = await uploadToCloudinary(req.files[i].buffer);
      images.push({ url: result.secure_url, altText: name.trim(), sortOrder: i });
    }
  }

  const product = await Product.create({
    name: name.trim(),
    slug,
    description: description?.trim() || "",
    categories: categoryIds,
    basePrice: Number(basePrice),
    discountType: discountType || null,
    discountValue: discountType ? Number(discountValue || 0) : 0,
    isActive: isActive !== "false" && isActive !== false,
    images,
  });

  let createdVariants = [];
  if (variants) {
    const list = typeof variants === "string" ? JSON.parse(variants) : variants;
    if (list.length) {
      createdVariants = await ProductVariant.insertMany(
        list.map(v => ({ ...v, productId: product._id, stockQuantity: Number(v.stockQuantity ?? 0) }))
      );
    }
  }

  res.status(201).json({ product, variants: createdVariants });
}

export async function updateProduct(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const { name, description, categories, basePrice, discountType, discountValue, isActive, keepImages } = req.body;

  if (name?.trim()) {
    product.name = name.trim();
    product.slug = slugify(name);
  }
  if (description !== undefined) product.description = description.trim();
  if (categories !== undefined) {
    const categoryIds = parseCategories(categories);
    if (!categoryIds.length) return res.status(400).json({ message: "At least one category is required" });
    product.categories = categoryIds;
  }
  if (basePrice !== undefined) product.basePrice = Number(basePrice);
  if (discountType !== undefined) {
    product.discountType = discountType || null;
    product.discountValue = discountType ? Number(discountValue || 0) : 0;
  } else if (discountValue !== undefined) {
    product.discountValue = Number(discountValue);
  }
  if (isActive !== undefined) product.isActive = isActive !== "false" && isActive !== false;

  // keepImages is a JSON array of URLs to retain; omitting it keeps all existing images
  let existingImages = product.images;
  if (keepImages !== undefined) {
    const keep = typeof keepImages === "string" ? JSON.parse(keepImages) : keepImages;
    existingImages = product.images.filter(img => keep.includes(img.url));
  }

  if (req.files?.length) {
    const startOrder = existingImages.length;
    for (let i = 0; i < req.files.length; i++) {
      const result = await uploadToCloudinary(req.files[i].buffer);
      existingImages.push({ url: result.secure_url, altText: product.name, sortOrder: startOrder + i });
    }
  }

  product.images = existingImages;
  await product.save();
  res.json({ product });
}

export async function deleteProduct(req, res) {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  await ProductVariant.deleteMany({ productId: req.params.id });

  logAudit({
    adminUserId: req.user._id,
    action: "PRODUCT_DELETE",
    targetType: "Product",
    targetId: product._id,
    meta: { name: product.name, slug: product.slug },
  });

  res.json({ message: "Product deleted" });
}

export async function addVariant(req, res) {
  const { size, color, sku, price, stockQuantity } = req.body;
  if (!size?.trim() || !color?.trim() || !sku?.trim()) {
    return res.status(400).json({ message: "size, color, and sku are required" });
  }
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const initialStock = Number(stockQuantity ?? 0);
  const variant = await ProductVariant.create({
    productId: req.params.id,
    size: size.trim(),
    color: color.trim(),
    sku: sku.trim(),
    price: price !== undefined ? Number(price) : undefined,
    stockQuantity: initialStock,
  });

  if (initialStock > 0) {
    await InventoryLog.create({
      variantId: variant._id,
      change: initialStock,
      reason: "Initial stock on variant creation",
    });
  }

  res.status(201).json({ variant });
}

export async function updateVariant(req, res) {
  const variant = await ProductVariant.findOne({
    _id: req.params.variantId,
    productId: req.params.id,
  });
  if (!variant) return res.status(404).json({ message: "Variant not found" });

  const { size, color, sku, price, stockQuantity } = req.body;
  if (size?.trim()) variant.size = size.trim();
  if (color?.trim()) variant.color = color.trim();
  if (sku?.trim()) variant.sku = sku.trim();
  if (price !== undefined) variant.price = Number(price);
  if (stockQuantity !== undefined) variant.stockQuantity = Number(stockQuantity);
  await variant.save();
  res.json({ variant });
}

export async function deleteVariant(req, res) {
  const variant = await ProductVariant.findOneAndDelete({
    _id: req.params.variantId,
    productId: req.params.id,
  });
  if (!variant) return res.status(404).json({ message: "Variant not found" });
  res.json({ message: "Variant deleted" });
}
