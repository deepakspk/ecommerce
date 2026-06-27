import { useState, useEffect, useRef } from "react";
import * as adminApi from "../../api/admin";
import EmptyState from "../../components/EmptyState";
import { cloudinaryUrl } from "../../utils/cloudinaryUrl";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { CARD_CLASS, INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_DANGER } from "../../utils/ui";

function BannerRowSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`${CARD_CLASS} p-3 flex items-center gap-4`}>
          <div className="w-28 h-16 rounded-md bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
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

const MAX_BANNERS = 5;

export default function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef();

  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let active = true;
    adminApi.getBanners()
      .then((d) => { if (active) setBanners(d.banners); })
      .catch((e) => { if (active) setError(e.response?.data?.message || "Failed to load banners"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    const d = await adminApi.getBanners();
    setBanners(d.banners);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!imageFile) {
      setFormError("Choose an image to upload");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      fd.append("link", link.trim());
      await adminApi.createBanner(fd);
      setImageFile(null);
      setLink("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
    } catch (e) {
      setFormError(e.response?.data?.message || "Error uploading banner");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(banner) {
    setBusyId(banner._id);
    try {
      const fd = new FormData();
      fd.append("isActive", String(!banner.isActive));
      await adminApi.updateBanner(banner._id, fd);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Error updating banner");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(banner) {
    if (!window.confirm("Delete this banner?")) return;
    setBusyId(banner._id);
    try {
      await adminApi.deleteBanner(banner._id);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Error deleting banner");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(banner, direction) {
    const idx = banners.findIndex((b) => b._id === banner._id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= banners.length) return;
    const reordered = [...banners];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const items = reordered.map((b, i) => ({ id: b._id, sortOrder: i }));
    try {
      await adminApi.reorderBanners(items);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Error reordering banners");
    }
  }

  const atLimit = banners.length >= MAX_BANNERS;

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <AdminPageHeader
        title="Homepage Banners"
        loading={loading}
        subtitle={`${banners.length} / ${MAX_BANNERS} banners`}
      />

      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

      <div className={`${CARD_CLASS} p-5 mb-6`}>
        {atLimit ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You've reached the {MAX_BANNERS}-banner limit. Delete one to add another.
          </p>
        ) : (
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>Banner image</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Link (optional)</label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/products?category=shoes"
                className={INPUT_CLASS}
              />
            </div>
            {formError && <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>}
            <button type="submit" disabled={saving} className={BUTTON_PRIMARY}>
              {saving ? "Uploading…" : "Add banner"}
            </button>
          </form>
        )}
      </div>

      {loading ? (
        <BannerRowSkeleton />
      ) : banners.length === 0 ? (
        <EmptyState title="No banners yet" message="Add one above to show it on the homepage." />
      ) : (
        <div className="space-y-3">
          {banners.map((banner, i) => (
            <div key={banner._id} className={`${CARD_CLASS} p-3 flex items-center gap-4`}>
              <img
                src={cloudinaryUrl(banner.imageUrl, 200)}
                alt=""
                className="w-28 h-16 object-cover rounded-md border border-gray-200 dark:border-gray-700 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{banner.link || "No link"}</p>
                <p className="text-xs text-gray-400">{banner.isActive ? "Active" : "Hidden"}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleMove(banner, "up")}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 flex items-center justify-center"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMove(banner, "down")}
                  disabled={i === banners.length - 1}
                  aria-label="Move down"
                  className="w-7 h-7 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 flex items-center justify-center"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleToggleActive(banner)}
                  disabled={busyId === banner._id}
                  className={`${BUTTON_SECONDARY} py-1.5 px-2.5 text-xs`}
                >
                  {banner.isActive ? "Hide" : "Show"}
                </button>
                <button
                  onClick={() => handleDelete(banner)}
                  disabled={busyId === banner._id}
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
