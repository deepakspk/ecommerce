import FeatureType from "../../models/FeatureType.js";
import Product from "../../models/Product.js";
import { slugify } from "../../services/categoryService.js";

export async function listFeatureTypes(req, res) {
  const featureTypes = await FeatureType.find().sort("sortOrder");
  res.json({ featureTypes });
}

export async function createFeatureType(req, res) {
  const { name, isActive } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

  const slug = slugify(name);
  if (!slug) return res.status(400).json({ message: "Could not generate a valid slug from this name" });

  const existing = await FeatureType.findOne({ slug });
  if (existing) return res.status(409).json({ message: `A feature type named "${name.trim()}" already exists` });

  const count = await FeatureType.countDocuments();
  const featureType = await FeatureType.create({
    name: name.trim(),
    slug,
    sortOrder: count,
    isActive: isActive === undefined ? true : isActive,
  });
  res.status(201).json({ featureType });
}

export async function updateFeatureType(req, res) {
  const featureType = await FeatureType.findById(req.params.id);
  if (!featureType) return res.status(404).json({ message: "Feature type not found" });

  const { name, isActive, sortOrder } = req.body;

  if (name?.trim() && name.trim() !== featureType.name) {
    const slug = slugify(name);
    if (!slug) return res.status(400).json({ message: "Could not generate a valid slug from this name" });
    const existing = await FeatureType.findOne({ slug, _id: { $ne: featureType._id } });
    if (existing) return res.status(409).json({ message: `A feature type named "${name.trim()}" already exists` });
    featureType.name = name.trim();
    featureType.slug = slug;
  }

  if (isActive !== undefined) featureType.isActive = isActive;
  if (sortOrder !== undefined) featureType.sortOrder = sortOrder;

  await featureType.save();
  res.json({ featureType });
}

export async function deleteFeatureType(req, res) {
  const featureType = await FeatureType.findByIdAndDelete(req.params.id);
  if (!featureType) return res.status(404).json({ message: "Feature type not found" });
  await Product.updateMany({ featureTypes: featureType._id }, { $pull: { featureTypes: featureType._id } });
  res.json({ message: "Feature type deleted" });
}

export async function reorderFeatureTypes(req, res) {
  const { items } = req.body;
  await FeatureType.bulkWrite(
    items.map(({ id, sortOrder }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { sortOrder } } },
    }))
  );
  res.json({ message: "Feature types reordered" });
}
