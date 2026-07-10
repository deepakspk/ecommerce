import ExcelJS from "exceljs";
import Product from "../../models/Product.js";
import ProductVariant from "../../models/ProductVariant.js";
import InventoryLog from "../../models/InventoryLog.js";
import Category from "../../models/Category.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import { logAudit } from "../../utils/auditLog.js";
import { sanitizeRichText } from "../../utils/sanitizeHtml.js";

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
      .populate("featureTypes", "name")
      .sort(SORT_OPTIONS[sort] || SORT_OPTIONS.newest)
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(filter),
  ]);

  res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function getProduct(req, res) {
  const product = await Product.findById(req.params.id)
    .populate("categories", "name")
    .populate("featureTypes", "name");
  if (!product) return res.status(404).json({ message: "Product not found" });
  const variants = await ProductVariant.find({ productId: product._id });
  res.json({ product, variants });
}

function parseCategories(value) {
  const list = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(list) ? list : [];
}

function parseFeatureTypes(value) {
  if (value === undefined) return [];
  const list = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(list) ? list : [];
}

function parseAdditionalInformation(value) {
  if (value === undefined) return undefined;
  const list = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && String(item.label ?? "").trim() && String(item.value ?? "").trim())
    .map((item) => ({ label: String(item.label).trim(), value: String(item.value).trim() }));
}

export async function createProduct(req, res) {
  const {
    name,
    shortDescription,
    description,
    categories,
    basePrice,
    discountType,
    discountValue,
    isActive,
    variants,
    stockQuantity,
    weight,
    warranty,
    additionalInformation,
    featureTypes,
  } = req.body;

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
    shortDescription: sanitizeRichText(shortDescription),
    description: sanitizeRichText(description),
    categories: categoryIds,
    basePrice: Number(basePrice),
    discountType: discountType || null,
    discountValue: discountType ? Number(discountValue || 0) : 0,
    isActive: isActive !== "false" && isActive !== false,
    images,
    weight: weight !== undefined && weight !== "" ? Number(weight) : undefined,
    warranty: typeof warranty === "string" ? warranty.trim() : "",
    additionalInformation: parseAdditionalInformation(additionalInformation) || [],
    featureTypes: parseFeatureTypes(featureTypes),
  });

  let createdVariants = [];
  if (variants) {
    const list = typeof variants === "string" ? JSON.parse(variants) : variants;
    if (list.length) {
      createdVariants = await ProductVariant.insertMany(
        list.map(v => ({
          ...v,
          productId: product._id,
          size: v.size?.trim() || "Default",
          color: v.color?.trim() || "Default",
          stockQuantity: Number(v.stockQuantity ?? 0),
        }))
      );
    }
  }

  if (createdVariants.length === 0) {
    const initialStock = Number(stockQuantity ?? 0);
    const defaultVariant = await ProductVariant.create({
      productId: product._id,
      size: "Default",
      color: "Default",
      sku: `DEFAULT-${product._id}`,
      stockQuantity: initialStock,
      isDefault: true,
    });
    createdVariants = [defaultVariant];

    if (initialStock > 0) {
      await InventoryLog.create({
        variantId: defaultVariant._id,
        change: initialStock,
        reason: "Initial stock on product creation",
      });
    }
  }

  res.status(201).json({ product, variants: createdVariants });
}

const BULK_UPLOAD_COLUMNS = [
  { key: "name", header: "Name*", width: 28 },
  { key: "description", header: "Description", width: 32 },
  { key: "categories", header: "Categories* (comma-separated)", width: 28 },
  { key: "basePrice", header: "Base Price*", width: 14 },
  { key: "discountType", header: "Discount Type (PERCENTAGE/FIXED)", width: 22 },
  { key: "discountValue", header: "Discount Value", width: 16 },
  { key: "isActive", header: "Is Active (TRUE/FALSE)", width: 16 },
  { key: "sku", header: "SKU", width: 18 },
  { key: "size", header: "Size", width: 12 },
  { key: "color", header: "Color", width: 12 },
  { key: "stockQuantity", header: "Stock Quantity", width: 16 },
  { key: "weight", header: "Weight (kg)", width: 14 },
];

function normalizeHeader(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const BULK_UPLOAD_HEADER_MAP = BULK_UPLOAD_COLUMNS.reduce((map, col) => {
  map[normalizeHeader(col.header)] = col.key;
  return map;
}, {});

export async function downloadBulkUploadSample(req, res) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");
  sheet.columns = BULK_UPLOAD_COLUMNS.map(({ header, key, width }) => ({ header, key, width }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    name: "Classic Cotton T-Shirt",
    description: "Soft cotton crew-neck t-shirt",
    categories: "Men, T-Shirts",
    basePrice: 1200,
    discountType: "PERCENTAGE",
    discountValue: 10,
    isActive: "TRUE",
    sku: "TSHIRT-BLK-M",
    size: "M",
    color: "Black",
    stockQuantity: 50,
    weight: 0.2,
  });
  sheet.addRow({
    name: "Running Shoes",
    description: "Lightweight everyday running shoes",
    categories: "Footwear",
    basePrice: 4500,
    isActive: "TRUE",
    stockQuantity: 20,
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=product-bulk-upload-sample.xlsx");
  await workbook.xlsx.write(res);
  res.end();
}

export async function bulkUploadProducts(req, res) {
  if (!req.file) return res.status(400).json({ message: "An Excel file (.xlsx) is required" });

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer);
  } catch {
    return res.status(400).json({ message: "Could not read the uploaded file. Please upload a valid .xlsx file." });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return res.status(400).json({ message: "The uploaded file has no worksheet" });

  const columnMap = {};
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = BULK_UPLOAD_HEADER_MAP[normalizeHeader(cell.value)];
    if (key) columnMap[colNumber] = key;
  });
  const categoryDocs = await Category.find({}, "name");
  const categoryByName = new Map(categoryDocs.map((c) => [c.name.trim().toLowerCase(), c._id]));

  const results = [];
  let created = 0;
  let failed = 0;
  const seenSlugs = new Set();

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const data = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = columnMap[colNumber];
      if (key) data[key] = cell.value;
    });

    const isBlankRow = Object.values(data).every((v) => v === null || v === undefined || String(v).trim() === "");
    if (isBlankRow) continue;

    const name = String(data.name ?? "").trim();
    if (!name) {
      failed++;
      results.push({ row: rowNumber, name: "", status: "error", message: "Name is required" });
      continue;
    }

    const categoryNames = String(data.categories ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!categoryNames.length) {
      failed++;
      results.push({ row: rowNumber, name, status: "error", message: "At least one category is required" });
      continue;
    }
    const categoryIds = [];
    const missingCategories = [];
    for (const catName of categoryNames) {
      const id = categoryByName.get(catName.toLowerCase());
      if (id) categoryIds.push(id);
      else missingCategories.push(catName);
    }
    if (missingCategories.length) {
      failed++;
      results.push({ row: rowNumber, name, status: "error", message: `Unknown categor${missingCategories.length > 1 ? "ies" : "y"}: ${missingCategories.join(", ")}` });
      continue;
    }

    const basePrice = Number(data.basePrice);
    if (data.basePrice === undefined || data.basePrice === "" || Number.isNaN(basePrice) || basePrice < 0) {
      failed++;
      results.push({ row: rowNumber, name, status: "error", message: "Base price must be a non-negative number" });
      continue;
    }

    const discountType = String(data.discountType ?? "").trim().toUpperCase();
    if (discountType && !["PERCENTAGE", "FIXED"].includes(discountType)) {
      failed++;
      results.push({ row: rowNumber, name, status: "error", message: "Discount type must be PERCENTAGE or FIXED" });
      continue;
    }
    const discountValue = discountType ? Number(data.discountValue ?? 0) : 0;
    if (discountType && (Number.isNaN(discountValue) || discountValue < 0)) {
      failed++;
      results.push({ row: rowNumber, name, status: "error", message: "Discount value must be a non-negative number" });
      continue;
    }
    if (discountType === "PERCENTAGE" && discountValue > 100) {
      failed++;
      results.push({ row: rowNumber, name, status: "error", message: "Percentage discount cannot exceed 100" });
      continue;
    }

    const isActiveRaw = String(data.isActive ?? "TRUE").trim().toUpperCase();
    if (isActiveRaw && !["TRUE", "FALSE"].includes(isActiveRaw)) {
      failed++;
      results.push({ row: rowNumber, name, status: "error", message: "Is Active must be TRUE or FALSE" });
      continue;
    }
    const isActive = isActiveRaw !== "FALSE";

    const slug = slugify(name);
    if (seenSlugs.has(slug)) {
      failed++;
      results.push({ row: rowNumber, name, status: "error", message: "Duplicate product name within this file" });
      continue;
    }
    const existing = await Product.findOne({ slug });
    if (existing) {
      failed++;
      results.push({ row: rowNumber, name, status: "error", message: "A product with this name already exists" });
      continue;
    }

    const sku = String(data.sku ?? "").trim();
    const size = String(data.size ?? "").trim();
    const color = String(data.color ?? "").trim();
    if ((size || color) && !sku) {
      failed++;
      results.push({ row: rowNumber, name, status: "error", message: "SKU is required when Size or Color is provided" });
      continue;
    }

    const stockQuantity = Number(data.stockQuantity ?? 0);
    if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
      failed++;
      results.push({ row: rowNumber, name, status: "error", message: "Stock quantity must be a non-negative number" });
      continue;
    }

    const weightRaw = String(data.weight ?? "").trim();
    let weight;
    if (weightRaw !== "") {
      weight = Number(weightRaw);
      if (Number.isNaN(weight) || weight < 0) {
        failed++;
        results.push({ row: rowNumber, name, status: "error", message: "Weight must be a non-negative number" });
        continue;
      }
    }

    try {
      const product = await Product.create({
        name,
        slug,
        description: sanitizeRichText(String(data.description ?? "").trim()),
        categories: categoryIds,
        basePrice,
        discountType: discountType || null,
        discountValue,
        isActive,
        images: [],
        weight,
      });
      seenSlugs.add(slug);

      const variant = await ProductVariant.create({
        productId: product._id,
        size: size || "Default",
        color: color || "Default",
        sku: sku || `DEFAULT-${product._id}`,
        stockQuantity,
        isDefault: !sku,
      });

      if (stockQuantity > 0) {
        await InventoryLog.create({
          variantId: variant._id,
          change: stockQuantity,
          reason: "Initial stock from bulk product upload",
        });
      }

      created++;
      results.push({ row: rowNumber, name, status: "success", message: "Created", productId: product._id });
    } catch (err) {
      failed++;
      results.push({
        row: rowNumber,
        name,
        status: "error",
        message: err.code === 11000 ? "Duplicate SKU or product slug" : "Failed to create product",
      });
    }
  }

  if (created > 0) {
    logAudit({
      adminUserId: req.user._id,
      action: "PRODUCT_BULK_UPLOAD",
      targetType: "Product",
      meta: { created, failed, total: results.length },
    });
  }

  res.json({ summary: { total: results.length, created, failed }, results });
}

export async function updateProduct(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const {
    name,
    shortDescription,
    description,
    categories,
    basePrice,
    discountType,
    discountValue,
    isActive,
    keepImages,
    weight,
    warranty,
    additionalInformation,
    featureTypes,
  } = req.body;

  if (name?.trim()) {
    product.name = name.trim();
    product.slug = slugify(name);
  }
  if (shortDescription !== undefined) product.shortDescription = sanitizeRichText(shortDescription);
  if (description !== undefined) product.description = sanitizeRichText(description);
  if (weight !== undefined) product.weight = weight === "" ? undefined : Number(weight);
  if (warranty !== undefined) product.warranty = typeof warranty === "string" ? warranty.trim() : "";
  if (additionalInformation !== undefined) {
    product.additionalInformation = parseAdditionalInformation(additionalInformation) || [];
  }
  if (featureTypes !== undefined) {
    product.featureTypes = parseFeatureTypes(featureTypes);
  }
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
  if (!sku?.trim()) {
    return res.status(400).json({ message: "sku is required" });
  }
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  await ProductVariant.deleteOne({ productId: req.params.id, isDefault: true });

  const initialStock = Number(stockQuantity ?? 0);
  const variant = await ProductVariant.create({
    productId: req.params.id,
    size: size?.trim() || "Default",
    color: color?.trim() || "Default",
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
