import Category from "../models/Category.js";
import Product from "../models/Product.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function uniqueSlug(baseSlug, excludeId) {
  let slug = baseSlug;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Category.exists({ slug, _id: { $ne: excludeId } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
  return slug;
}

async function assertUniqueNameUnderParent(name, parentId, excludeId) {
  const existing = await Category.findOne({
    parent: parentId || null,
    name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
    _id: { $ne: excludeId },
  });
  if (existing) {
    throw new HttpError(409, `A category named "${name.trim()}" already exists under this parent`);
  }
}

async function resolveParent(parentId) {
  if (!parentId) return null;
  const parent = await Category.findById(parentId);
  if (!parent) throw new HttpError(400, "Parent category not found");
  return parent;
}

function assertNoCircularReference(categoryId, parentDoc) {
  if (!parentDoc) return;
  if (String(parentDoc._id) === String(categoryId)) {
    throw new HttpError(400, "A category cannot be its own parent");
  }
  if (parentDoc.path.some((id) => String(id) === String(categoryId))) {
    throw new HttpError(400, "Cannot assign a descendant category as the parent (circular reference)");
  }
}

// After a category's own level/path changes, cascade the recalculation down to every descendant.
async function recalculateSubtree(categoryId) {
  let frontierIds = [categoryId];
  while (frontierIds.length) {
    const children = await Category.find({ parent: { $in: frontierIds } });
    if (!children.length) break;
    const parents = await Category.find({ _id: { $in: frontierIds } }, "level path");
    const parentById = new Map(parents.map((p) => [String(p._id), p]));

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      children.map((child) => {
        const parent = parentById.get(String(child.parent));
        child.level = parent.level + 1;
        child.path = [...parent.path, parent._id];
        return child.save();
      })
    );
    frontierIds = children.map((c) => c._id);
  }
}

export async function getDescendantIds(categoryId) {
  const docs = await Category.find({ path: categoryId }, "_id");
  return docs.map((d) => d._id);
}

export async function createCategory(data) {
  const {
    name,
    description,
    image,
    parent: parentId,
    isActive,
    sortOrder,
    seoTitle,
    seoDescription,
  } = data;

  if (!name?.trim()) throw new HttpError(400, "Name is required");

  const parentDoc = await resolveParent(parentId);
  await assertUniqueNameUnderParent(name, parentDoc ? parentDoc._id : null);

  const baseSlug = slugify(name);
  if (!baseSlug) throw new HttpError(400, "Could not generate a valid slug from this name");
  const slug = await uniqueSlug(baseSlug);

  return Category.create({
    name: name.trim(),
    slug,
    description: description?.trim() || "",
    image: image || "",
    parent: parentDoc ? parentDoc._id : null,
    level: parentDoc ? parentDoc.level + 1 : 0,
    path: parentDoc ? [...parentDoc.path, parentDoc._id] : [],
    isActive: isActive === undefined ? true : isActive,
    sortOrder: sortOrder ?? 0,
    seoTitle: seoTitle?.trim() || "",
    seoDescription: seoDescription?.trim() || "",
  });
}

export async function updateCategory(id, data) {
  const category = await Category.findById(id);
  if (!category) throw new HttpError(404, "Category not found");

  const {
    name,
    description,
    image,
    parent: parentId,
    isActive,
    sortOrder,
    seoTitle,
    seoDescription,
  } = data;

  let parentChanged = false;
  let newParentDoc = null;

  if (parentId !== undefined) {
    newParentDoc = await resolveParent(parentId);
    assertNoCircularReference(category._id, newParentDoc);
    const currentParentId = category.parent ? String(category.parent) : null;
    const nextParentId = newParentDoc ? String(newParentDoc._id) : null;
    parentChanged = currentParentId !== nextParentId;
  }

  const effectiveParentId = parentChanged ? (newParentDoc ? newParentDoc._id : null) : category.parent;
  const nameChanged = Boolean(name?.trim()) && name.trim() !== category.name;

  if (nameChanged || parentChanged) {
    await assertUniqueNameUnderParent(nameChanged ? name : category.name, effectiveParentId, category._id);
  }

  if (nameChanged) {
    category.name = name.trim();
    category.slug = await uniqueSlug(slugify(name), category._id);
  }

  if (description !== undefined) category.description = description.trim();
  if (image !== undefined) category.image = image;
  if (isActive !== undefined) category.isActive = isActive;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  if (seoTitle !== undefined) category.seoTitle = seoTitle.trim();
  if (seoDescription !== undefined) category.seoDescription = seoDescription.trim();

  if (parentChanged) {
    category.parent = newParentDoc ? newParentDoc._id : null;
    category.level = newParentDoc ? newParentDoc.level + 1 : 0;
    category.path = newParentDoc ? [...newParentDoc.path, newParentDoc._id] : [];
  }

  await category.save();

  if (parentChanged) {
    await recalculateSubtree(category._id);
  }

  return category;
}

export async function deleteCategory(id, { force = false } = {}) {
  const category = await Category.findById(id);
  if (!category) throw new HttpError(404, "Category not found");

  const descendantIds = await getDescendantIds(id);
  const allIds = [category._id, ...descendantIds];
  const childCount = await Category.countDocuments({ parent: id });
  const productCount = await Product.countDocuments({ categories: { $in: allIds } });

  if (!force && (childCount > 0 || productCount > 0)) {
    const reason =
      childCount > 0
        ? "Category has subcategories. Delete or move them first, or pass force=true to delete the whole subtree."
        : "Category contains products. Reassign or delete them first, or pass force=true.";
    throw new HttpError(409, reason);
  }

  await Product.updateMany({ categories: { $in: allIds } }, { $pull: { categories: { $in: allIds } } });
  await Category.deleteMany({ _id: { $in: allIds } });

  return { deletedCount: allIds.length };
}

export async function getCategoryById(id) {
  const category = await Category.findById(id);
  if (!category) throw new HttpError(404, "Category not found");
  return category;
}

export async function getRootCategories({ activeOnly = true } = {}) {
  const filter = { parent: null };
  if (activeOnly) filter.isActive = true;
  return Category.find(filter).sort({ sortOrder: 1, name: 1 });
}

export async function getChildren(categoryId) {
  const exists = await Category.exists({ _id: categoryId });
  if (!exists) throw new HttpError(404, "Category not found");
  return Category.find({ parent: categoryId }).sort({ sortOrder: 1, name: 1 });
}

export async function getBreadcrumbs(categoryId) {
  const category = await Category.findById(categoryId);
  if (!category) throw new HttpError(404, "Category not found");

  const ancestors = category.path.length
    ? await Category.find({ _id: { $in: category.path } }, "name slug")
    : [];
  const byId = new Map(ancestors.map((a) => [String(a._id), a]));
  const trail = [...category.path.map((id) => byId.get(String(id))).filter(Boolean), category];

  return trail.map((c) => ({ id: c._id, name: c.name, slug: c.slug }));
}

export async function searchCategories(q, { activeOnly = true } = {}) {
  if (!q?.trim()) return [];
  const filter = {
    $or: [{ name: { $regex: escapeRegex(q.trim()), $options: "i" } }, { description: { $regex: escapeRegex(q.trim()), $options: "i" } }],
  };
  if (activeOnly) filter.isActive = true;
  return Category.find(filter).sort({ name: 1 }).limit(50);
}

export async function getStats(categoryId) {
  const category = await Category.findById(categoryId);
  if (!category) throw new HttpError(404, "Category not found");

  const descendantIds = await getDescendantIds(categoryId);
  const [directProducts, descendantProducts, totalChildren] = await Promise.all([
    Product.countDocuments({ categories: categoryId }),
    descendantIds.length ? Product.countDocuments({ categories: { $in: descendantIds } }) : 0,
    Category.countDocuments({ parent: categoryId }),
  ]);

  return {
    totalProducts: directProducts,
    totalProductsIncludingDescendants: directProducts + descendantProducts,
    totalChildren,
    totalDescendants: descendantIds.length,
  };
}

// Single pass over all categories + two grouped aggregations — avoids N+1 queries at any scale.
export async function listCategoriesFlat() {
  const [categories, childCounts, productCounts] = await Promise.all([
    Category.find().sort({ level: 1, sortOrder: 1, name: 1 }).lean(),
    Category.aggregate([{ $match: { parent: { $ne: null } } }, { $group: { _id: "$parent", count: { $sum: 1 } } }]),
    Product.aggregate([{ $unwind: "$categories" }, { $group: { _id: "$categories", count: { $sum: 1 } } }]),
  ]);
  const childById = new Map(childCounts.map((c) => [String(c._id), c.count]));
  const productById = new Map(productCounts.map((c) => [String(c._id), c.count]));

  return categories.map((c) => ({
    ...c,
    childCount: childById.get(String(c._id)) || 0,
    productCount: productById.get(String(c._id)) || 0,
  }));
}

export async function reorderCategories(items) {
  if (!Array.isArray(items) || !items.length) return;
  await Category.bulkWrite(
    items.map(({ id, sortOrder }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { sortOrder } } },
    }))
  );
}

// One query for all categories, grouped into a tree in memory — O(n) regardless of depth/breadth.
export async function buildTree({ activeOnly = false, rootId = null } = {}) {
  const all = await Category.find({}).sort({ sortOrder: 1, name: 1 }).lean();

  const byParent = new Map();
  for (const cat of all) {
    const key = cat.parent ? String(cat.parent) : "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(cat);
  }

  function buildNode(cat, ancestorActive) {
    const effectiveIsActive = ancestorActive && cat.isActive;
    const children = (byParent.get(String(cat._id)) || []).map((child) => buildNode(child, effectiveIsActive));
    return {
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      level: cat.level,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      effectiveIsActive,
      children,
    };
  }

  function prune(nodes) {
    return nodes.filter((n) => n.effectiveIsActive).map((n) => ({ ...n, children: prune(n.children) }));
  }

  let roots;
  if (rootId) {
    const rootCat = all.find((c) => String(c._id) === String(rootId));
    roots = rootCat ? [rootCat] : [];
  } else {
    roots = byParent.get("root") || [];
  }

  let tree = roots.map((cat) => buildNode(cat, true));
  if (activeOnly) tree = prune(tree);
  return tree;
}
