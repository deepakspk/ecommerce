import { useState, useEffect } from "react";
import * as adminApi from "../../api/admin";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState("");
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await adminApi.getCategories();
      setCategories(data.categories);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(cat) {
    setEditId(cat._id);
    setFormName(cat.name);
    setError("");
  }

  function cancelEdit() {
    setEditId(null);
    setFormName("");
    setError("");
  }

  async function handleSave() {
    if (!formName.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await adminApi.updateCategory(editId, { name: formName.trim() });
      } else {
        await adminApi.createCategory({ name: formName.trim() });
      }
      setFormName("");
      setEditId(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Error saving category");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this category? Products in this category will lose their category link.")) return;
    try {
      await adminApi.deleteCategory(id);
      setCategories(cs => cs.filter(c => c._id !== id));
    } catch (e) {
      alert(e.response?.data?.message || "Error deleting category");
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Categories</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 max-w-md">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          {editId ? "Edit Category" : "Add Category"}
        </h2>
        <div className="flex gap-2">
          <input
            value={formName}
            onChange={e => setFormName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            placeholder="Category name"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "…" : editId ? "Update" : "Add"}
          </button>
          {editId && (
            <button
              onClick={cancelEdit}
              className="text-gray-600 px-3 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="text-gray-400 text-sm">No categories yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Slug</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map(cat => (
                <tr key={cat._id} className={editId === cat._id ? "bg-blue-50" : "hover:bg-gray-50"}>
                  <td className="px-5 py-3 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">{cat.slug}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => startEdit(cat)} className="text-blue-600 hover:underline text-xs mr-4">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(cat._id)} className="text-red-600 hover:underline text-xs">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
