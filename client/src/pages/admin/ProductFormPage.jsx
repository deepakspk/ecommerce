import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import { cloudinaryUrl } from "../../utils/cloudinaryUrl";
import { H1_CLASS } from "../../utils/ui";

const EMPTY_VARIANT = { size: "", color: "", sku: "", price: "", stockQuantity: "" };

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", description: "", categories: [], basePrice: "",
    discountType: "", discountValue: "", isActive: true,
    stockQuantity: "",
  });
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  // Images
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [failedExisting, setFailedExisting] = useState(() => new Set());
  const fileInputRef = useRef();

  // Variants (edit mode: live from DB; create mode: staged for submission)
  const [variants, setVariants] = useState([]);
  const [stagedVariants, setStagedVariants] = useState([]);
  const [newVariant, setNewVariant] = useState(EMPTY_VARIANT);
  const [variantError, setVariantError] = useState("");
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [editVariantForm, setEditVariantForm] = useState(EMPTY_VARIANT);

  useEffect(() => {
    adminApi.getCategories().then(d => setCategories(d.categories)).catch(() => {});
    if (isEdit) {
      adminApi.getProduct(id)
        .then(({ product, variants: v }) => {
          setForm({
            name: product.name,
            description: product.description || "",
            categories: (product.categories || []).map((c) => c._id || String(c)),
            basePrice: String(product.basePrice),
            discountType: product.discountType || "",
            discountValue: product.discountValue ? String(product.discountValue) : "",
            isActive: product.isActive,
          });
          setExistingImages(product.images || []);
          setVariants(v);
        })
        .catch(() => setError("Failed to load product"))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.categories.length) { setError("At least one category is required"); return; }
    if (!form.basePrice) { setError("Base price is required"); return; }
    if (form.discountType && !form.discountValue) { setError("Discount value is required when a discount type is selected"); return; }
    if (form.discountType === "PERCENTAGE" && Number(form.discountValue) > 100) {
      setError("Percentage discount cannot exceed 100"); return;
    }
    setError("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("categories", JSON.stringify(form.categories));
      fd.append("basePrice", form.basePrice);
      fd.append("discountType", form.discountType);
      fd.append("discountValue", form.discountType ? form.discountValue : "0");
      fd.append("isActive", String(form.isActive));
      if (isEdit) {
        fd.append("keepImages", JSON.stringify(existingImages.map(i => i.url)));
      }
      newFiles.forEach(f => fd.append("images", f));
      if (!isEdit && stagedVariants.length) {
        fd.append("variants", JSON.stringify(stagedVariants));
      }
      if (!isEdit) {
        fd.append("stockQuantity", form.stockQuantity || "0");
      }
      if (isEdit) {
        await adminApi.updateProduct(id, fd);
      } else {
        await adminApi.createProduct(fd);
      }
      navigate("/admin/products");
    } catch (e) {
      setError(e.response?.data?.message || "Error saving product");
      setSaving(false);
    }
  }

  // Create mode: staged variants
  function addStagedVariant() {
    if (!newVariant.size.trim() || !newVariant.color.trim() || !newVariant.sku.trim()) {
      setVariantError("Size, color, and SKU are required");
      return;
    }
    setStagedVariants(v => [...v, { ...newVariant }]);
    setNewVariant(EMPTY_VARIANT);
    setVariantError("");
  }

  // Edit mode: live variant API calls
  async function handleAddVariant() {
    if (!newVariant.size.trim() || !newVariant.color.trim() || !newVariant.sku.trim()) {
      setVariantError("Size, color, and SKU are required");
      return;
    }
    try {
      const { variant } = await adminApi.addVariant(id, {
        ...newVariant,
        stockQuantity: Number(newVariant.stockQuantity || 0),
        price: newVariant.price ? Number(newVariant.price) : undefined,
      });
      setVariants(v => [...v, variant]);
      setNewVariant(EMPTY_VARIANT);
      setVariantError("");
    } catch (e) {
      setVariantError(e.response?.data?.message || "Error adding variant");
    }
  }

  function startEditVariant(v) {
    setEditingVariantId(v._id);
    setEditVariantForm({
      size: v.size, color: v.color, sku: v.sku,
      price: v.price != null ? String(v.price) : "",
      stockQuantity: String(v.stockQuantity),
    });
  }

  async function saveEditVariant(variantId) {
    try {
      const { variant } = await adminApi.updateVariant(id, variantId, {
        ...editVariantForm,
        price: editVariantForm.price ? Number(editVariantForm.price) : undefined,
        stockQuantity: Number(editVariantForm.stockQuantity || 0),
      });
      setVariants(v => v.map(x => x._id === variantId ? variant : x));
      setEditingVariantId(null);
    } catch (e) {
      alert(e.response?.data?.message || "Error updating variant");
    }
  }

  async function handleDeleteVariant(variantId) {
    if (!confirm("Delete this variant?")) return;
    try {
      await adminApi.deleteVariant(id, variantId);
      setVariants(v => v.filter(x => x._id !== variantId));
    } catch (e) {
      alert(e.response?.data?.message || "Error deleting variant");
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-48 mb-6" />
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24" />
          <div className="h-9 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-9 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-9 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const displayVariants = isEdit ? variants : stagedVariants;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/products" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm">← Products</Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <h1 className={H1_CLASS}>{isEdit ? "Edit Product" : "New Product"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Details */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Product name"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Product description"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categories</label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 max-h-40 overflow-y-auto space-y-1">
              {categories.length === 0 ? (
                <p className="text-xs text-gray-400">No categories yet — create one first.</p>
              ) : (
                categories.map(c => (
                  <label key={c._id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300" style={{ paddingLeft: (c.level || 0) * 16 }}>
                    <input
                      type="checkbox"
                      checked={form.categories.includes(c._id)}
                      onChange={e => setForm(f => ({
                        ...f,
                        categories: e.target.checked
                          ? [...f.categories, c._id]
                          : f.categories.filter(id => id !== c._id),
                      }))}
                      className="rounded dark:bg-gray-800 dark:border-gray-600"
                    />
                    {c.name}
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Price (Rs.)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.basePrice}
              onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))}
              placeholder="0"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          {!isEdit && stagedVariants.length === 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stockQuantity}
                onChange={e => setForm(f => ({ ...f, stockQuantity: e.target.value }))}
                placeholder="0"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">Stock for this product. Add variants below instead if it comes in multiple sizes/colors.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount</label>
              <select
                value={form.discountType}
                onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">None</option>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed amount (Rs.)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {form.discountType === "PERCENTAGE" ? "Discount %" : "Discount Rs."}
              </label>
              <input
                type="number"
                min="0"
                max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                step="0.01"
                value={form.discountValue}
                onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                placeholder="0"
                disabled={!form.discountType}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded dark:bg-gray-800 dark:border-gray-600"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">Active (visible to customers)</label>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Images</h2>

          {isEdit && existingImages.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {existingImages.map(img => (
                <div key={img.url} className="relative group">
                  {failedExisting.has(img.url) ? (
                    <div className="w-20 h-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600 text-[10px]">
                      No image
                    </div>
                  ) : (
                    <img
                      src={cloudinaryUrl(img.url, 150)}
                      alt=""
                      loading="lazy"
                      onError={() => setFailedExisting(prev => new Set(prev).add(img.url))}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setExistingImages(imgs => imgs.filter(i => i.url !== img.url))}
                    aria-label="Remove image"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {newFiles.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {newFiles.map((f, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(f)}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg border-2 border-dashed border-brand-300"
                  />
                  <button
                    type="button"
                    onClick={() => setNewFiles(files => files.filter((_, idx) => idx !== i))}
                    aria-label="Remove image"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          >
            + Add Images
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              const selected = Array.from(e.target.files);
              setNewFiles(f => [...f, ...selected]);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-gray-400 mt-1.5">Max 5 MB per image. JPEG, PNG, WebP.</p>
        </div>

        {error && (
          <p className="text-red-700 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
        </button>
      </form>

      {/* Variants */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 mt-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Variants
          {!isEdit && <span className="ml-2 text-xs font-normal text-gray-400">(added when you submit the form)</span>}
        </h2>

        {displayVariants.length > 0 && (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-3 font-medium">Size</th>
                  <th className="pb-2 pr-3 font-medium">Color</th>
                  <th className="pb-2 pr-3 font-medium">SKU</th>
                  <th className="pb-2 pr-3 font-medium">Price</th>
                  <th className="pb-2 pr-3 font-medium">Stock</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isEdit
                  ? variants.map(v =>
                      editingVariantId === v._id ? (
                        <tr key={v._id} className="bg-brand-50 dark:bg-brand-950/40">
                          {(["size", "color", "sku", "price", "stockQuantity"]).map(k => (
                            <td key={k} className="py-1.5 pr-2">
                              <input
                                value={editVariantForm[k]}
                                onChange={e => setEditVariantForm(f => ({ ...f, [k]: e.target.value }))}
                                className="w-full border border-brand-400 dark:bg-gray-800 dark:text-gray-100 rounded px-2 py-1 text-xs focus:outline-none"
                              />
                            </td>
                          ))}
                          <td className="py-1.5 whitespace-nowrap">
                            <button onClick={() => saveEditVariant(v._id)}
                              className="text-brand-600 hover:underline mr-2">Save</button>
                            <button onClick={() => setEditingVariantId(null)}
                              className="text-gray-400 hover:underline">Cancel</button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={v._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                          <td className="py-2 pr-3 text-gray-800 dark:text-gray-100">{v.size}</td>
                          <td className="py-2 pr-3 text-gray-800 dark:text-gray-100">{v.color}</td>
                          <td className="py-2 pr-3 text-gray-400 font-mono">{v.sku}</td>
                          <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{v.price != null ? `Rs. ${v.price}` : "—"}</td>
                          <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{v.stockQuantity}</td>
                          <td className="py-2 whitespace-nowrap">
                            <button onClick={() => startEditVariant(v)}
                              className="text-brand-600 hover:underline mr-2">Edit</button>
                            <button onClick={() => handleDeleteVariant(v._id)}
                              className="text-red-500 hover:underline">Delete</button>
                          </td>
                        </tr>
                      )
                    )
                  : stagedVariants.map((v, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <td className="py-2 pr-3 text-gray-800 dark:text-gray-100">{v.size}</td>
                        <td className="py-2 pr-3 text-gray-800 dark:text-gray-100">{v.color}</td>
                        <td className="py-2 pr-3 text-gray-400 font-mono">{v.sku}</td>
                        <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{v.price || "—"}</td>
                        <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{v.stockQuantity || "0"}</td>
                        <td className="py-2">
                          <button onClick={() => setStagedVariants(vs => vs.filter((_, idx) => idx !== i))}
                            className="text-red-500 hover:underline">Remove</button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add variant row */}
        <div className="grid grid-cols-6 gap-2">
          {[["size", "Size"], ["color", "Color"], ["sku", "SKU"], ["price", "Price"], ["stockQuantity", "Stock"]].map(
            ([key, label]) => (
              <input
                key={key}
                value={newVariant[key]}
                onChange={e => setNewVariant(v => ({ ...v, [key]: e.target.value }))}
                placeholder={label}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )
          )}
          <button
            type="button"
            onClick={isEdit ? handleAddVariant : addStagedVariant}
            className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-700 transition-colors"
          >
            + Add
          </button>
        </div>
        {variantError && <p className="text-red-600 text-xs mt-1.5">{variantError}</p>}
      </div>
    </div>
  );
}
