import { useState, useEffect } from "react";
import * as adminApi from "../../api/admin";
import EmptyState from "../../components/EmptyState";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { CARD_CLASS, INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_DANGER } from "../../utils/ui";

function FeatureTypeRowSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`${CARD_CLASS} p-3 flex items-center gap-4`}>
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-7 w-12 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-7 w-14 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FeatureTypesPage() {
  const [featureTypes, setFeatureTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");

  useEffect(() => {
    let active = true;
    adminApi.getFeatureTypes()
      .then((d) => { if (active) setFeatureTypes(d.featureTypes); })
      .catch((e) => { if (active) setError(e.response?.data?.message || "Failed to load feature types"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    const d = await adminApi.getFeatureTypes();
    setFeatureTypes(d.featureTypes);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Name is required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await adminApi.createFeatureType({ name: name.trim() });
      setName("");
      await refresh();
    } catch (e) {
      setFormError(e.response?.data?.message || "Error creating feature type");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(featureType) {
    setBusyId(featureType._id);
    try {
      await adminApi.updateFeatureType(featureType._id, { isActive: !featureType.isActive });
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Error updating feature type");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(featureType) {
    if (!window.confirm(`Delete "${featureType.name}"? Products tagged with it will simply lose the tag.`)) return;
    setBusyId(featureType._id);
    try {
      await adminApi.deleteFeatureType(featureType._id);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Error deleting feature type");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(featureType, direction) {
    const idx = featureTypes.findIndex((ft) => ft._id === featureType._id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= featureTypes.length) return;
    const reordered = [...featureTypes];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const items = reordered.map((ft, i) => ({ id: ft._id, sortOrder: i }));
    try {
      await adminApi.reorderFeatureTypes(items);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Error reordering feature types");
    }
  }

  function startEdit(featureType) {
    setEditingId(featureType._id);
    setEditName(featureType.name);
    setEditError("");
  }

  async function saveEdit(featureType) {
    if (!editName.trim()) {
      setEditError("Name is required");
      return;
    }
    setBusyId(featureType._id);
    try {
      await adminApi.updateFeatureType(featureType._id, { name: editName.trim() });
      setEditingId(null);
      await refresh();
    } catch (e) {
      setEditError(e.response?.data?.message || "Error renaming feature type");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <AdminPageHeader
        title="Feature Types"
        loading={loading}
        subtitle="Tags like New Arrival, Trending, or Best Seller that can be assigned to products to power homepage carousels."
      />

      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

      <div className={`${CARD_CLASS} p-5 mb-6`}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New Arrival"
              className={INPUT_CLASS}
            />
          </div>
          {formError && <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>}
          <button type="submit" disabled={saving} className={BUTTON_PRIMARY}>
            {saving ? "Adding…" : "Add feature type"}
          </button>
        </form>
      </div>

      {loading ? (
        <FeatureTypeRowSkeleton />
      ) : featureTypes.length === 0 ? (
        <EmptyState title="No feature types yet" message="Add one above, then assign it to products in the product form." />
      ) : (
        <div className="space-y-3">
          {featureTypes.map((featureType, i) => (
            <div key={featureType._id} className={`${CARD_CLASS} p-3 flex items-center gap-4`}>
              <div className="flex-1 min-w-0">
                {editingId === featureType._id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`${INPUT_CLASS} py-1`}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(featureType)} className="text-brand-600 hover:underline text-xs flex-shrink-0">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:underline text-xs flex-shrink-0">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{featureType.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{featureType.slug}</p>
                  </>
                )}
                {editError && editingId === featureType._id && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{editError}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleMove(featureType, "up")}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 flex items-center justify-center"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMove(featureType, "down")}
                  disabled={i === featureTypes.length - 1}
                  aria-label="Move down"
                  className="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 flex items-center justify-center"
                >
                  ↓
                </button>
                {editingId !== featureType._id && (
                  <button onClick={() => startEdit(featureType)} className={`${BUTTON_SECONDARY} py-1.5 px-2.5 text-xs`}>
                    Rename
                  </button>
                )}
                <button
                  onClick={() => handleToggleActive(featureType)}
                  disabled={busyId === featureType._id}
                  className={`${BUTTON_SECONDARY} py-1.5 px-2.5 text-xs`}
                >
                  {featureType.isActive ? "Hide" : "Show"}
                </button>
                <button
                  onClick={() => handleDelete(featureType)}
                  disabled={busyId === featureType._id}
                  className={`${BUTTON_DANGER} py-1.5 px-2.5 text-xs`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
