import { uploadToCloudinary } from "../../config/cloudinary.js";
import * as categoryService from "../../services/categoryService.js";

export async function listCategories(req, res) {
  const categories = await categoryService.listCategoriesFlat();
  res.json({ categories });
}

export async function getCategoryTree(req, res) {
  const tree = await categoryService.buildTree({ activeOnly: false });
  res.json({ tree });
}

export async function getCategory(req, res) {
  const category = await categoryService.getCategoryById(req.params.id);
  res.json({ category });
}

export async function getCategoryStats(req, res) {
  const stats = await categoryService.getStats(req.params.id);
  res.json({ stats });
}

export async function getCategoryBreadcrumbs(req, res) {
  const breadcrumbs = await categoryService.getBreadcrumbs(req.params.id);
  res.json({ breadcrumbs });
}

export async function createCategory(req, res) {
  let image = req.body.image || "";
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "ecommerce-nepal/categories");
    image = result.secure_url;
  }
  const category = await categoryService.createCategory({ ...req.body, image });
  res.status(201).json({ category });
}

export async function updateCategory(req, res) {
  const data = { ...req.body };
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "ecommerce-nepal/categories");
    data.image = result.secure_url;
  }
  const category = await categoryService.updateCategory(req.params.id, data);
  res.json({ category });
}

export async function deleteCategory(req, res) {
  const force = req.query.force === "true" || req.body?.force === true;
  const result = await categoryService.deleteCategory(req.params.id, { force });
  res.json({ message: "Category deleted", ...result });
}

export async function reorderCategories(req, res) {
  await categoryService.reorderCategories(req.body.items);
  res.json({ message: "Categories reordered" });
}
