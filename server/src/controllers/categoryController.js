import * as categoryService from "../services/categoryService.js";

export async function getRootCategories(req, res) {
  const categories = await categoryService.getRootCategories({ activeOnly: true });
  res.json({ categories });
}

export async function getCategoryTree(req, res) {
  const tree = await categoryService.buildTree({ activeOnly: true });
  res.json({ tree });
}

export async function searchCategories(req, res) {
  const categories = await categoryService.searchCategories(req.query.q, { activeOnly: true });
  res.json({ categories });
}

export async function getCategoryById(req, res) {
  const category = await categoryService.getCategoryById(req.params.id);
  res.json({ category });
}

export async function getChildren(req, res) {
  const children = await categoryService.getChildren(req.params.id);
  res.json({ children });
}

export async function getBreadcrumbs(req, res) {
  const breadcrumbs = await categoryService.getBreadcrumbs(req.params.id);
  res.json({ breadcrumbs });
}
