import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import EmptyState from "../../components/EmptyState";
import { cloudinaryUrl } from "../../utils/cloudinaryUrl";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { CARD_CLASS, BUTTON_SECONDARY, BUTTON_DANGER, BADGE_BASE } from "../../utils/ui";

function promotionStatus(promotion) {
  if (!promotion.isActive) return { label: "Hidden", color: "bg-gray-100 text-gray-600" };
  const now = new Date();
  if (new Date(promotion.visibleFrom) > now) return { label: "Scheduled", color: "bg-amber-100 text-amber-700" };
  if (new Date(promotion.visibleUntil) < now) return { label: "Expired", color: "bg-red-100 text-red-600" };
  return { label: "Live", color: "bg-green-100 text-green-700" };
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function PromotionRowSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`${CARD_CLASS} p-3 flex items-center gap-4`}>
          <div className="w-28 h-16 rounded-md bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="h-7 w-12 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-7 w-14 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let active = true;
    adminApi.getPromotions()
      .then((d) => { if (active) setPromotions(d.promotions); })
      .catch((e) => { if (active) setError(e.response?.data?.message || "Failed to load promotions"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    const d = await adminApi.getPromotions();
    setPromotions(d.promotions);
  }

  async function handleDelete(promotion) {
    if (!window.confirm(`Delete promotion "${promotion.title}"?`)) return;
    setBusyId(promotion._id);
    try {
      await adminApi.deletePromotion(promotion._id);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Error deleting promotion");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <AdminPageHeader
        title="Promotions"
        loading={loading}
        subtitle={`${promotions.length} promotion${promotions.length === 1 ? "" : "s"}`}
        action={
          <Link
            to="/admin/promotions/new"
            className="bg-white text-gray-900 rounded-md py-2 px-4 text-sm font-semibold hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            + New Promotion
          </Link>
        }
      />

      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <PromotionRowSkeleton />
      ) : promotions.length === 0 ? (
        <EmptyState
          title="No promotions yet"
          message="Create one to show a promotional banner and popup on the store."
          action={
            <Link to="/admin/promotions/new" className="text-sm text-brand-600 hover:underline font-medium">
              Create your first promotion
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {promotions.map((promotion) => {
            const status = promotionStatus(promotion);
            return (
              <div key={promotion._id} className={`${CARD_CLASS} p-3 flex flex-wrap sm:flex-nowrap items-center gap-4`}>
                <img
                  src={cloudinaryUrl(promotion.webBannerUrl, 200)}
                  alt=""
                  className="w-28 h-16 object-cover rounded-md border border-gray-200 dark:border-gray-700 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{promotion.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatDate(promotion.visibleFrom)} – {formatDate(promotion.visibleUntil)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`${BADGE_BASE} ${status.color}`}>{status.label}</span>
                    {(promotion.webPopupUrl || promotion.mobilePopupUrl) && (
                      <span className={`${BADGE_BASE} bg-indigo-100 text-indigo-700`}>Popup</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link
                    to={`/admin/promotions/${promotion._id}/edit`}
                    className={`${BUTTON_SECONDARY} py-1.5 px-2.5 text-xs`}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(promotion)}
                    disabled={busyId === promotion._id}
                    className={`${BUTTON_DANGER} py-1.5 px-2.5 text-xs`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
