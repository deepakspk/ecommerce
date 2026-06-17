import Category from "../../models/Category.js";

function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export async function listCategories(req, res) {
  const categories = await Category.find().sort("name");
  res.json({ categories });
}

export async function createCategory(req, res) {
  const { name, parentId } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
  const slug = slugify(name);
  const existing = await Category.findOne({ slug });
  if (existing) return res.status(409).json({ message: "Category with this name already exists" });
  const category = await Category.create({ name: name.trim(), slug, parentId: parentId || null });
  res.status(201).json({ category });
}

export async function updateCategory(req, res) {
  const { name, parentId } = req.body;
  const category = await Category.findById(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });
  if (name?.trim()) {
    category.name = name.trim();
    category.slug = slugify(name);
  }
  if (parentId !== undefined) category.parentId = parentId || null;
  await category.save();
  res.json({ category });
}

export async function deleteCategory(req, res) {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json({ message: "Category deleted" });
}
