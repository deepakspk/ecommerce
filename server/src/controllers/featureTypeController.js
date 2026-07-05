import FeatureType from "../models/FeatureType.js";

export async function getActiveFeatureTypes(req, res) {
  const featureTypes = await FeatureType.find({ isActive: true }).sort("sortOrder");
  res.json({ featureTypes });
}
