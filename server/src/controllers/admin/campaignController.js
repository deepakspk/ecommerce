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

// Parses the products payload (JSON string from FormData) and enforces the
// special-price rule against each product's CURRENT selling price (base price
// minus its own discount) — a campaign price that isn't actually cheaper is
// rejected with a message naming the offending product. Duplicates collapse to
// their first occurrence so the same product can't appear twice in a campaign.
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
    let specialPrice = entry.specialPrice;
    if (specialPrice === "" || specialPrice === undefined) specialPrice = null;
    if (specialPrice !== null) {
      specialPrice = Number(specialPrice);
      if (!Number.isFinite(specialPrice) || specialPrice <= 0) {
        throw httpError(400, "Campaign special price must be a positive number");
      }
    }
    items.push({ product: id, specialPrice });
  }

  const products = await Product.find({ _id: { $in: items.map((i) => i.product) } }).select(
    "name basePrice discountType discountValue"
  );
  const byId = new Map(products.map((p) => [String(p._id), p]));

  for (const item of items) {
    const product = byId.get(item.product);
    if (!product) throw httpError(400, "One of the selected products no longer exists");
    if (item.specialPrice !== null) {
      const { finalPrice } = getDiscountedPrice(product.basePrice, product);
      if (item.specialPrice >= finalPrice) {
        throw httpError(
          400,
          `Special price for "${product.name}" must be lower than its current selling price (Rs. ${finalPrice})`
        );
      }
    }
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
