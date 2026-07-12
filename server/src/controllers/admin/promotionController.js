import Promotion from "../../models/Promotion.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";

const FOLDER = "ecommerce-nepal/promotions";

const IMAGE_FIELDS = [
  { field: "webBanner", key: "webBannerUrl" },
  { field: "mobileBanner", key: "mobileBannerUrl" },
  { field: "webPopup", key: "webPopupUrl" },
  { field: "mobilePopup", key: "mobilePopupUrl" },
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

export async function listPromotions(req, res) {
  const promotions = await Promotion.find().sort("-createdAt");
  res.json({ promotions });
}

export async function getPromotion(req, res) {
  const promotion = await Promotion.findById(req.params.id);
  if (!promotion) return res.status(404).json({ message: "Promotion not found" });
  res.json({ promotion });
}

export async function createPromotion(req, res) {
  if (!req.files?.webBanner?.[0]) {
    return res.status(400).json({ message: "A web banner image is required" });
  }

  const urls = await uploadImages(req.files);
  const promotion = await Promotion.create({
    title: req.body.title,
    visibleFrom: req.body.visibleFrom,
    visibleUntil: req.body.visibleUntil,
    isActive: req.body.isActive === undefined ? true : parseBool(req.body.isActive),
    ...urls,
  });
  res.status(201).json({ promotion });
}

export async function updatePromotion(req, res) {
  const data = {};
  if (req.body.title !== undefined) data.title = req.body.title;
  if (req.body.visibleFrom !== undefined) data.visibleFrom = req.body.visibleFrom;
  if (req.body.visibleUntil !== undefined) data.visibleUntil = req.body.visibleUntil;
  if (req.body.isActive !== undefined) data.isActive = parseBool(req.body.isActive);

  // Optional images can be cleared from the edit form (e.g. "Remove" on popups)
  if (parseBool(req.body.removeMobileBanner)) data.mobileBannerUrl = "";
  if (parseBool(req.body.removeWebPopup)) data.webPopupUrl = "";
  if (parseBool(req.body.removeMobilePopup)) data.mobilePopupUrl = "";

  Object.assign(data, await uploadImages(req.files));

  const promotion = await Promotion.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  if (!promotion) return res.status(404).json({ message: "Promotion not found" });
  res.json({ promotion });
}

export async function deletePromotion(req, res) {
  const promotion = await Promotion.findByIdAndDelete(req.params.id);
  if (!promotion) return res.status(404).json({ message: "Promotion not found" });
  res.json({ message: "Promotion deleted" });
}
