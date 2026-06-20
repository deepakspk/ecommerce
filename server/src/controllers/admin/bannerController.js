import Banner from "../../models/Banner.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";

const MAX_BANNERS = 5;

export async function listBanners(req, res) {
  const banners = await Banner.find().sort("sortOrder");
  res.json({ banners });
}

export async function createBanner(req, res) {
  const count = await Banner.countDocuments();
  if (count >= MAX_BANNERS) {
    return res.status(400).json({ message: `You can only have up to ${MAX_BANNERS} banners` });
  }
  if (!req.file) {
    return res.status(400).json({ message: "A banner image is required" });
  }

  const result = await uploadToCloudinary(req.file.buffer, "ecommerce-nepal/banners");
  const banner = await Banner.create({
    imageUrl: result.secure_url,
    link: req.body.link || "",
    sortOrder: count,
  });
  res.status(201).json({ banner });
}

export async function updateBanner(req, res) {
  const data = {};
  if (req.body.link !== undefined) data.link = req.body.link;
  if (req.body.isActive !== undefined) data.isActive = req.body.isActive === "true" || req.body.isActive === true;
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "ecommerce-nepal/banners");
    data.imageUrl = result.secure_url;
  }

  const banner = await Banner.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!banner) return res.status(404).json({ message: "Banner not found" });
  res.json({ banner });
}

export async function deleteBanner(req, res) {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) return res.status(404).json({ message: "Banner not found" });
  res.json({ message: "Banner deleted" });
}

export async function reorderBanners(req, res) {
  const { items } = req.body;
  await Banner.bulkWrite(
    items.map(({ id, sortOrder }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { sortOrder } } },
    }))
  );
  res.json({ message: "Banners reordered" });
}
