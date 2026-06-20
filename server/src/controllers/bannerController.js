import Banner from "../models/Banner.js";

export async function getActiveBanners(req, res) {
  const banners = await Banner.find({ isActive: true }).sort("sortOrder");
  res.json({ banners });
}
