import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import EmptyState from "../../components/EmptyState";
import { cloudinaryUrl } from "../../utils/cloudinaryUrl";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { CARD_CLASS, BUTTON_SECONDARY, BUTTON_DANGER, BADGE_BASE } from "../../utils/ui";

const STATUS_BADGES = {
  UPCOMING: { label: "Upcoming", color: "bg-amber-100 text-amber-700" },
  RUNNING: { label: "Running", color: "bg-green-100 text-green-700" },
  ENDED: { label: "Ended", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-600" },
};

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CampaignRowSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`${CARD_CLASS} p-3 flex items-center gap-4`}>
          <div className="w-28 h-16 rounded-md bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
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

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // Drag & drop reorder: the list rearranges live while dragging, then the new
  // order persists on drop. On failure the previous order is restored.
  const dragIndexRef = useRef(null);
  const orderBeforeDragRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi.getCampaigns()
      .then((d) => { if (active) setCampaigns(d.campaigns); })
      .catch((e) => { if (active) setError(e.response?.data?.message || "Failed to load campaigns"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function refresh() {
    const d = await adminApi.getCampaigns();
    setCampaigns(d.campaigns);
  }

  function handleDragStart(e, index) {
    dragIndexRef.current = index;
    orderBeforeDragRef.current = campaigns;
    setDragging(true);
    e.dataTransfer.effectAllowed = "move";
    // Some browsers need data set for the drag to start
    e.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    setCampaigns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = index;
  }

  async function handleDragEnd() {
    setDragging(false);
    const before = orderBeforeDragRef.current;
    dragIndexRef.current = null;
    orderBeforeDragRef.current = null;
    if (!before) return;
    if (before.map((c) => c._id).join() === campaigns.map((c) => c._id).join()) return;

    try {
      await adminApi.reorderCampaigns(campaigns.map((c, i) => ({ id: c._id, sortOrder: i })));
    } catch (e) {
      setCampaigns(before);
      setError(e.response?.data?.message || "Error saving campaign order");
    }
  }

  async function handleDelete(campaign) {
    if (!window.confirm(`Delete campaign "${campaign.name}"?`)) return;
    setBusyId(campaign._id);
    try {
      await adminApi.deleteCampaign(campaign._id);
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Error deleting campaign");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <AdminPageHeader
        title="Campaigns"
        loading={loading}
        subtitle={`${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"} — drag to reorder`}
        action={
          <Link
            to="/admin/campaigns/new"
            className="bg-white text-gray-900 rounded-md py-2 px-4 text-sm font-semibold hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            + New Campaign
          </Link>
        }
      />

      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <CampaignRowSkeleton />
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          message="Create one to run a Flash Sale, Black Friday, or seasonal sale on the store."
          action={
            <Link to="/admin/campaigns/new" className="text-sm text-brand-600 hover:underline font-medium">
              Create your first campaign
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign, index) => {
            const status = STATUS_BADGES[campaign.status] || STATUS_BADGES.ENDED;
            return (
              <div
                key={campaign._id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => e.preventDefault()}
                onDragEnd={handleDragEnd}
                className={`${CARD_CLASS} p-3 flex flex-wrap sm:flex-nowrap items-center gap-3 ${
                  dragging ? "cursor-grabbing" : ""
                }`}
              >
                <span
                  title="Drag to reorder"
                  className="cursor-grab text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                  </svg>
                </span>
                <img
                  src={cloudinaryUrl(campaign.desktopBannerUrl, 200)}
                  alt=""
                  className="w-28 h-16 object-cover rounded-md border border-gray-200 dark:border-gray-700 flex-shrink-0 pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-black/10"
                      style={{ backgroundColor: campaign.themeColor }}
                      title={`Theme ${campaign.themeColor}`}
                    />
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{campaign.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatDateTime(campaign.startDate)} – {formatDateTime(campaign.endDate)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={`${BADGE_BASE} ${status.color}`}>{status.label}</span>
                    {!campaign.isActive && (
                      <span className={`${BADGE_BASE} bg-gray-100 text-gray-600`}>Hidden</span>
                    )}
                    <span className={`${BADGE_BASE} bg-indigo-100 text-indigo-700`}>
                      {campaign.products.length} product{campaign.products.length === 1 ? "" : "s"}
                    </span>
                    <span className="text-xs text-gray-400">/campaigns/{campaign.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link
                    to={`/admin/campaigns/${campaign._id}/edit`}
                    className={`${BUTTON_SECONDARY} py-1.5 px-2.5 text-xs`}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(campaign)}
                    disabled={busyId === campaign._id}
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
