import { useState, useEffect, useMemo, useRef } from "react";
import * as adminApi from "../../api/admin";
import { cloudinaryUrl } from "../../utils/cloudinaryUrl";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { CARD_CLASS } from "../../utils/ui";

const EMPTY_FORM = {
  name: "",
  description: "",
  parent: "",
  isActive: true,
  sortOrder: 0,
  seoTitle: "",
  seoDescription: "",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [existingImage, setExistingImage] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef();

  const [statsFor, setStatsFor] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const expandedInitialized = useRef(false);

  async function load() {
    try {
      const data = await adminApi.getCategories();
      setCategories(data.categories);
      // Default to expanding every category that has children, once on first load only.
      if (!expandedInitialized.current) {
        setExpanded(new Set(data.categories.filter((c) => c.childCount > 0).map((c) => c._id)));
        expandedInitialized.current = true;
      }
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const byParent = useMemo(() => {
    const map = new Map();
    for (const c of categories) {
      const key = c.parent ? String(c.parent) : "root";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }
    return map;
  }, [categories]);

  const roots = byParent.get("root") || [];

  // A category cannot be re-parented under itself or any of its own descendants.
  const invalidParentIds = useMemo(() => {
    if (!editId) return new Set();
    const invalid = new Set([editId]);
    for (const c of categories) {
      if ((c.path || []).map(String).includes(editId)) invalid.add(c._id);
    }
    return invalid;
  }, [categories, editId]);

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(parentId) {
    setEditId(null);
    setForm({ ...EMPTY_FORM, parent: parentId || "" });
    setImageFile(null);
    setExistingImage("");
    setImageFailed(false);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(cat) {
    setEditId(cat._id);
    setForm({
      name: cat.name,
      description: cat.description || "",
      parent: cat.parent ? String(cat.parent) : "",
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
      seoTitle: cat.seoTitle || "",
      seoDescription: cat.seoDescription || "",
    });
    setImageFile(null);
    setExistingImage(cat.image || "");
    setImageFailed(false);
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("parent", form.parent || "");
      fd.append("isActive", String(form.isActive));
      fd.append("sortOrder", String(form.sortOrder || 0));
      fd.append("seoTitle", form.seoTitle.trim());
      fd.append("seoDescription", form.seoDescription.trim());
      if (imageFile) fd.append("image", imageFile);

      if (editId) {
        await adminApi.updateCategory(editId, fd);
      } else {
        await adminApi.createCategory(fd);
      }
      closeForm();
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Error saving category");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(cat) {
    try {
      const fd = new FormData();
      fd.append("isActive", String(!cat.isActive));
      await adminApi.updateCategory(cat._id, fd);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Error updating category");
    }
  }

  async function handleDelete(cat) {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      await adminApi.deleteCategory(cat._id);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || "Error deleting category";
      if (err.response?.status === 409) {
        if (confirm(`${msg}\n\nForce delete anyway? This removes all subcategories and unlinks any products.`)) {
          try {
            await adminApi.deleteCategory(cat._id, true);
            await load();
          } catch (err2) {
            alert(err2.response?.data?.message || "Error force-deleting category");
          }
        }
      } else {
        alert(msg);
      }
    }
  }

  async function handleMove(cat, direction) {
    const key = cat.parent ? String(cat.parent) : "root";
    const siblings = [...(byParent.get(key) || [])];
    const idx = siblings.findIndex((s) => s._id === cat._id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    [siblings[idx], siblings[swapIdx]] = [siblings[swapIdx], siblings[idx]];
    const items = siblings.map((s, i) => ({ id: s._id, sortOrder: i }));
    try {
      await adminApi.reorderCategories(items);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Error reordering categories");
    }
  }

  async function openStats(cat) {
    setStatsFor(cat);
    setStats(null);
    setStatsLoading(true);
    try {
      const data = await adminApi.getCategoryStats(cat._id);
      setStats(data.stats);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <AdminPageHeader
        title="Categories"
        action={
          <button
            onClick={() => openCreate(null)}
            className="bg-white text-brand-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors shadow-sm"
          >
            + Root Category
          </button>
        }
      />

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : roots.length === 0 ? (
        <p className="text-gray-400 text-sm">No categories yet.</p>
      ) : (
        <div className={`${CARD_CLASS} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Slug</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Products</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roots.map((cat) => (
                  <CategoryRow
                    key={cat._id}
                    cat={cat}
                    depth={0}
                    byParent={byParent}
                    expanded={expanded}
                    toggleExpand={toggleExpand}
                    onAddChild={openCreate}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    onMove={handleMove}
                    onStats={openStats}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <Modal onClose={closeForm} title={editId ? "Edit Category" : "Add Category"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
              <select
                value={form.parent}
                onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— None (root category) —</option>
                {categories
                  .filter((c) => !invalidParentIds.has(c._id))
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {"— ".repeat(c.level)}
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
              <div className="flex items-center gap-3">
                {imageFile ? (
                  <img src={URL.createObjectURL(imageFile)} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                ) : existingImage && !imageFailed ? (
                  <img
                    src={cloudinaryUrl(existingImage, 100)}
                    alt=""
                    onError={() => setImageFailed(true)}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-[10px]">
                    No image
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400"
                >
                  Choose Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files[0] || null)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
              </div>
            </div>

            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="text-sm font-medium text-gray-700 cursor-pointer">SEO</summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">SEO Title</label>
                  <input
                    value={form.seoTitle}
                    onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">SEO Description</label>
                  <textarea
                    value={form.seoDescription}
                    onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>
              </div>
            </details>

            {formError && <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeForm} className="text-gray-600 px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : editId ? "Save Changes" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {statsFor && (
        <Modal onClose={() => setStatsFor(null)} title={`Stats — ${statsFor.name}`}>
          {statsLoading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : stats ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Stat label="Products (direct)" value={stats.totalProducts} />
              <Stat label="Products (incl. subcategories)" value={stats.totalProductsIncludingDescendants} />
              <Stat label="Direct subcategories" value={stats.totalChildren} />
              <Stat label="Total descendants" value={stats.totalDescendants} />
            </dl>
          ) : (
            <p className="text-red-600 text-sm">Failed to load stats.</p>
          )}
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-lg font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="text-gray-400 hover:text-gray-700">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CategoryRow({ cat, depth, byParent, expanded, toggleExpand, onAddChild, onEdit, onDelete, onToggleActive, onMove, onStats }) {
  const children = byParent.get(String(cat._id)) || [];
  const isExpanded = expanded.has(cat._id);

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-5 py-3 font-medium text-gray-900">
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 20 }}>
            {children.length > 0 ? (
              <button
                onClick={() => toggleExpand(cat._id)}
                aria-label={isExpanded ? `Collapse ${cat.name}` : `Expand ${cat.name}`}
                className="w-4 text-gray-400 hover:text-gray-700"
              >
                {isExpanded ? "▾" : "▸"}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <button onClick={() => onMove(cat, "up")} aria-label={`Move ${cat.name} up`} className="text-gray-300 hover:text-gray-600 text-xs" title="Move up">▲</button>
            <button onClick={() => onMove(cat, "down")} aria-label={`Move ${cat.name} down`} className="text-gray-300 hover:text-gray-600 text-xs" title="Move down">▼</button>
            <span className="ml-1">{cat.name}</span>
          </div>
        </td>
        <td className="px-5 py-3 text-gray-400 font-mono text-xs">{cat.slug}</td>
        <td className="px-5 py-3 text-gray-600">
          {cat.productCount}
          {children.length > 0 && <span className="text-gray-400"> ({cat.childCount} subcategories)</span>}
        </td>
        <td className="px-5 py-3">
          <button
            onClick={() => onToggleActive(cat)}
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              cat.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {cat.isActive ? "Active" : "Disabled"}
          </button>
        </td>
        <td className="px-5 py-3 text-right whitespace-nowrap">
          <button onClick={() => onStats(cat)} className="text-gray-500 hover:underline text-xs mr-3">Stats</button>
          <button onClick={() => onAddChild(cat._id)} className="text-brand-600 hover:underline text-xs mr-3">+ Sub</button>
          <button onClick={() => onEdit(cat)} className="text-brand-600 hover:underline text-xs mr-3">Edit</button>
          <button onClick={() => onDelete(cat)} className="text-red-600 hover:underline text-xs">Delete</button>
        </td>
      </tr>
      {isExpanded &&
        children.map((child) => (
          <CategoryRow
            key={child._id}
            cat={child}
            depth={depth + 1}
            byParent={byParent}
            expanded={expanded}
            toggleExpand={toggleExpand}
            onAddChild={onAddChild}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
            onMove={onMove}
            onStats={onStats}
          />
        ))}
    </>
  );
}
