import Campaign from "../../models/Campaign.js";
import Product from "../../models/Product.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import { slugify } from "../../services/categoryService.js";
import { getDiscountedPrice } from "../../utils/pricing.js";

const FOLDER = "ecommerce-nepal/campaigns";

const IMAGE_FIELDS = [
  { field: "desktopBanner", key: "desktopBannerUrl" },
  { field: "mobileBanner", key: "mobileBannerUrl" },
  { field: "actionImage", key: "actionImageUrl" },
];

async function uploadImages(files = {}) {
  const urls = {};
  for (const { field, key } of IMAGE_FIELDS) {
    const file = files[field]?.[0];
    if (file) {
      const result = await uploadToCloudinary(file.buffer, FOLDER);
      urls[key] = result.secure_url;
    }
  }
  return urls;
}

function parseBool(value) {
  return value === "true" || value === true;
}

async function uniqueSlug(baseSlug, excludeId) {
  let slug = baseSlug || "campaign";
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Campaign.exists({ slug, _id: { $ne: excludeId } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
  return slug;
}

// null means "sell at regular price"; otherwise must be a positive number
function parseSpecialPrice(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw httpError(400, "Campaign special price must be a positive number");
  }
  return value;
}

// The special price must beat the product's CURRENT selling price (base price
// minus its own discount) — a campaign price that isn't actually cheaper is
// rejected with a message naming the offending product.
function assertSpecialPriceBeatsSelling(product, specialPrice) {
  if (specialPrice === null) return;
  const { finalPrice } = getDiscountedPrice(product.basePrice, product);
  if (specialPrice >= finalPrice) {
    throw httpError(
      400,
      `Special price for "${product.name}" must be lower than its current selling price (Rs. ${finalPrice})`
    );
  }
}

// Parses the products payload (JSON string from FormData) used by bulk
// create/update. Duplicates collapse to their first occurrence so the same
// product can't appear twice in a campaign.
async function resolveCampaignProducts(raw) {
  if (raw === undefined) return undefined;
  let list;
  try {
    list = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw httpError(400, "products must be valid JSON");
  }
  if (!Array.isArray(list)) throw httpError(400, "products must be an array");

  const seen = new Set();
  const items = [];
  for (const entry of list) {
    const id = String(entry?.product || "");
    if (!/^[0-9a-f]{24}$/i.test(id)) throw httpError(400, "Each campaign product needs a valid product id");
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({ product: id, specialPrice: parseSpecialPrice(entry.specialPrice) });
  }

  const products = await Product.find({ _id: { $in: items.map((i) => i.product) } }).select(
    "name basePrice discountType discountValue"
  );
  const byId = new Map(products.map((p) => [String(p._id), p]));

  for (const item of items) {
    const product = byId.get(item.product);
    if (!product) throw httpError(400, "One of the selected products no longer exists");
    assertSpecialPriceBeatsSelling(product, item.specialPrice);
  }
  return items;
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function listCampaigns(req, res) {
  const campaigns = await Campaign.find().sort({ sortOrder: 1, createdAt: -1 });
  res.json({ campaigns });
}

export async function getCampaign(req, res) {
  const campaign = await Campaign.findById(req.params.id).populate(
    "products.product",
    "name slug basePrice discountType discountValue images"
  );
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  res.json({ campaign });
}

export async function createCampaign(req, res, next) {
  try {
    if (!req.files?.desktopBanner?.[0]) {
      return res.status(400).json({ message: "A desktop banner image is required" });
    }
    if (!req.files?.mobileBanner?.[0]) {
      return res.status(400).json({ message: "A mobile banner image is required" });
    }

    const products = (await resolveCampaignProducts(req.body.products)) ?? [];
    const urls = await uploadImages(req.files);
    const slug = await uniqueSlug(slugify(req.body.slug?.trim() || req.body.name));

    // New campaigns go to the end of the admin's drag-sorted list
    const last = await Campaign.findOne().sort("-sortOrder").select("sortOrder");

    const campaign = await Campaign.create({
      name: req.body.name,
      slug,
      description: req.body.description?.trim() || "",
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      buttonLabel: req.body.buttonLabel?.trim() || "Shop Now",
      themeColor: req.body.themeColor || undefined,
      isActive: req.body.isActive === undefined ? true : parseBool(req.body.isActive),
      isCancelled: parseBool(req.body.isCancelled),
      sortOrder: last ? last.sortOrder + 1 : 0,
      products,
      ...urls,
    });
    res.status(201).json({ campaign });
  } catch (err) {
    next(err);
  }
}

export async function updateCampaign(req, res, next) {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.description !== undefined) data.description = req.body.description.trim();
    if (req.body.startDate !== undefined) data.startDate = req.body.startDate;
    if (req.body.endDate !== undefined) data.endDate = req.body.endDate;
    if (req.body.buttonLabel !== undefined) data.buttonLabel = req.body.buttonLabel.trim() || "Shop Now";
    if (req.body.themeColor !== undefined) data.themeColor = req.body.themeColor;
    if (req.body.isActive !== undefined) data.isActive = parseBool(req.body.isActive);
    if (req.body.isCancelled !== undefined) data.isCancelled = parseBool(req.body.isCancelled);

    if (req.body.slug !== undefined && slugify(req.body.slug) !== campaign.slug) {
      data.slug = await uniqueSlug(slugify(req.body.slug.trim() || req.body.name || campaign.name), campaign._id);
    }

    const products = await resolveCampaignProducts(req.body.products);
    if (products !== undefined) data.products = products;

    // Optional action image can be cleared from the edit form
    if (parseBool(req.body.removeActionImage)) data.actionImageUrl = "";

    Object.assign(data, await uploadImages(req.files));

    Object.assign(campaign, data);
    await campaign.save(); // save() so the endDate > startDate validator sees both dates
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
}

export async function deleteCampaign(req, res) {
  const campaign = await Campaign.findByIdAndDelete(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  res.json({ message: "Campaign deleted" });
}

export async function reorderCampaigns(req, res) {
  const { items } = req.body;
  await Campaign.bulkWrite(
    items.map(({ id, sortOrder }) => ({
      updateOne: { filter: { _id: id }, update: { sortOrder } },
    }))
  );
  const campaigns = await Campaign.find().sort({ sortOrder: 1, createdAt: -1 });
  res.json({ campaigns });
}

// ── Per-product management (edit form's right-hand panel) ───────────────────
// Campaign product lists are small (dozens at most), so pagination/search
// happen in memory after one products query — this keeps the campaign's array
// order (= storefront display order) intact for free.

const CAMPAIGN_PRODUCTS_PAGE_SIZE = 10;

export async function listCampaignProducts(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const search = (req.query.search || "").trim();
  const filter = { _id: { $in: campaign.products.map((e) => e.product) } };
  if (search) {
    filter.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
  const docs = await Product.find(filter).select(
    "name slug basePrice discountType discountValue images isActive"
  );
  const byId = new Map(docs.map((p) => [String(p._id), p]));

  // Preserve campaign order; deleted or non-matching products drop out
  const entries = campaign.products.filter((e) => byId.has(String(e.product)));
  const total = entries.length;
  const pageNum = Math.max(1, Number(req.query.page) || 1);
  const pageEntries = entries.slice(
    (pageNum - 1) * CAMPAIGN_PRODUCTS_PAGE_SIZE,
    pageNum * CAMPAIGN_PRODUCTS_PAGE_SIZE
  );

  res.json({
    products: pageEntries.map((e) => ({
      product: byId.get(String(e.product)),
      specialPrice: e.specialPrice,
    })),
    total,
    totalInCampaign: campaign.products.length,
    page: pageNum,
    pages: Math.ceil(total / CAMPAIGN_PRODUCTS_PAGE_SIZE),
  });
}

export async function addCampaignProduct(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const productId = req.body.product;
  if (campaign.products.some((e) => String(e.product) === productId)) {
    return res.status(409).json({ message: "This product is already in the campaign" });
  }
  const product = await Product.findById(productId).select("name basePrice discountType discountValue");
  if (!product) return res.status(404).json({ message: "Product not found" });

  const specialPrice = parseSpecialPrice(req.body.specialPrice);
  assertSpecialPriceBeatsSelling(product, specialPrice);

  campaign.products.push({ product: productId, specialPrice });
  await campaign.save();
  res.status(201).json({ message: "Product added", totalInCampaign: campaign.products.length });
}

export async function updateCampaignProduct(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const index = campaign.products.findIndex((e) => String(e.product) === req.params.productId);
  if (index === -1) return res.status(404).json({ message: "Product is not in this campaign" });

  if (req.body.specialPrice !== undefined) {
    const product = await Product.findById(req.params.productId).select(
      "name basePrice discountType discountValue"
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    const specialPrice = parseSpecialPrice(req.body.specialPrice);
    assertSpecialPriceBeatsSelling(product, specialPrice);
    campaign.products[index].specialPrice = specialPrice;
  }

  // First 10 campaign products show on the home screen, so "move to top" is
  // the ordering control that still works with a paginated list.
  if (req.body.moveToTop === true || req.body.moveToTop === "true") {
    const [entry] = campaign.products.splice(index, 1);
    campaign.products.unshift(entry);
  }

  await campaign.save();
  res.json({ message: "Product updated" });
}

export async function removeCampaignProduct(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const before = campaign.products.length;
  campaign.products = campaign.products.filter((e) => String(e.product) !== req.params.productId);
  if (campaign.products.length === before) {
    return res.status(404).json({ message: "Product is not in this campaign" });
  }
  await campaign.save();
  res.json({ message: "Product removed", totalInCampaign: campaign.products.length });
}
