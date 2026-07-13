import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import ImageDropzone from "../../components/admin/ImageDropzone";
import CampaignProductsPanel from "../../components/admin/CampaignProductsPanel";
import { CARD_CLASS, INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY, BUTTON_SECONDARY, BADGE_BASE } from "../../utils/ui";

const STATUS_BADGES = {
  UPCOMING: { label: "Upcoming", color: "bg-amber-100 text-amber-700" },
  RUNNING: { label: "Running", color: "bg-green-100 text-green-700" },
  ENDED: { label: "Ended", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-600" },
};

function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// datetime-local input value in the admin's local timezone
function toDateTimeInput(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
    </div>
  );
}

export default function CampaignFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Shop Now");
  const [themeColor, setThemeColor] = useState("#dc2626");
  const [isActive, setIsActive] = useState(true);
  const [isCancelled, setIsCancelled] = useState(false);
  const [status, setStatus] = useState(null);

  // Staged files (new uploads) and existing saved URLs (edit mode)
  const [files, setFiles] = useState({});
  const [existing, setExisting] = useState({});

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    adminApi.getCampaign(id)
      .then(({ campaign }) => {
        setName(campaign.name);
        setDescription(campaign.description || "");
        setSlug(campaign.slug);
        setSlugTouched(true);
        setStartDate(toDateTimeInput(campaign.startDate));
        setEndDate(toDateTimeInput(campaign.endDate));
        setButtonLabel(campaign.buttonLabel || "Shop Now");
        setThemeColor(campaign.themeColor || "#dc2626");
        setIsActive(campaign.isActive);
        setIsCancelled(campaign.isCancelled);
        setStatus(campaign.status);
        setExisting({
          desktopBanner: campaign.desktopBannerUrl || "",
          mobileBanner: campaign.mobileBannerUrl || "",
          actionImage: campaign.actionImageUrl || "",
        });
      })
      .catch(() => setError("Failed to load campaign"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function setFile(field, file) {
    setFiles((prev) => ({ ...prev, [field]: file }));
  }

  function clearImage(field) {
    setFiles((prev) => ({ ...prev, [field]: null }));
    setExisting((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Campaign name is required"); return; }
    if (!startDate) { setError("Start date is required"); return; }
    if (!endDate) { setError("End date is required"); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError("End date must be later than the start date"); return; }
    if (!files.desktopBanner && !existing.desktopBanner) { setError("A desktop banner image is required"); return; }
    if (!files.mobileBanner && !existing.mobileBanner) { setError("A mobile banner image is required"); return; }

    setError("");
    setSaving(true);
    setSaved(false);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("description", description.trim());
      fd.append("slug", slug.trim() || slugify(name));
      fd.append("startDate", new Date(startDate).toISOString());
      fd.append("endDate", new Date(endDate).toISOString());
      fd.append("buttonLabel", buttonLabel.trim());
      fd.append("themeColor", themeColor);
      fd.append("isActive", String(isActive));
      fd.append("isCancelled", String(isCancelled));
      for (const field of ["desktopBanner", "mobileBanner", "actionImage"]) {
        if (files[field]) fd.append(field, files[field]);
      }
      if (isEdit && !files.actionImage && !existing.actionImage) {
        fd.append("removeActionImage", "true");
      }

      if (isEdit) {
        await adminApi.updateCampaign(id, fd);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        // Land on the edit page so products can be added right away
        const { campaign } = await adminApi.createCampaign(fd);
        navigate(`/admin/campaigns/${campaign._id}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error saving campaign");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl">
        <div className={`${CARD_CLASS} p-6 animate-pulse space-y-4`}>
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const statusBadge = status ? STATUS_BADGES[status] : null;

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      {/* Breadcrumb */}
      <div className={`${CARD_CLASS} px-4 py-3 mb-6 flex items-center gap-3 text-sm`}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <nav className="flex items-center gap-2 text-gray-500 dark:text-gray-400 min-w-0">
          <Link to="/admin/dashboard" className="hover:text-brand-600">Dashboard</Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <Link to="/admin/campaigns" className="hover:text-brand-600">Campaigns</Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-gray-900 dark:text-gray-100 font-medium truncate">
            {isEdit ? "Edit Campaign" : "New Campaign"}
          </span>
        </nav>
        {statusBadge && (
          <span className={`${BADGE_BASE} ${statusBadge.color} ml-auto flex-shrink-0`}>{statusBadge.label}</span>
        )}
      </div>

      {/* Two-part layout: campaign details (left) and product management (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <form onSubmit={handleSubmit} className={`${CARD_CLASS} p-5 sm:p-6 space-y-6`}>
          <SectionDivider label="Campaign Details" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Campaign Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="Flash Sale"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Slug</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-md px-2 py-2.5 bg-gray-50 dark:bg-gray-800 whitespace-nowrap">
                  /campaigns/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                  placeholder="flash-sale"
                  className={`${INPUT_CLASS} !rounded-l-none`}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                placeholder="Hurry up! Limited time offers"
                className={INPUT_CLASS}
              />
              <p className="text-xs text-gray-400 mt-1">Shown under the campaign name on the storefront.</p>
            </div>
            <div>
              <label className={LABEL_CLASS}>Start Date & Time *</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>End Date & Time *</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Button Label</label>
              <input
                type="text"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                maxLength={50}
                placeholder="Shop Now"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Theme Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  aria-label="Pick theme color"
                  className="w-10 h-10 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5 bg-white dark:bg-gray-800"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  placeholder="#dc2626"
                  className={`${INPUT_CLASS} !w-32`}
                />
              </div>
            </div>
            <div className="flex items-center gap-8 sm:col-span-2 pt-1">
              <Toggle checked={isActive} onChange={setIsActive} label="Visible on storefront" />
              {isEdit && (
                <Toggle checked={isCancelled} onChange={setIsCancelled} label="Cancelled" />
              )}
            </div>
          </div>

          <SectionDivider label="Banner Images" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Desktop Banner <span className="text-red-500">*</span>
              </p>
              <p className="text-xs text-gray-400 mb-2">Recommended: 1200×400px — JPG, PNG, WebP, or GIF</p>
              <ImageDropzone
                label="desktop banner"
                file={files.desktopBanner}
                existingUrl={existing.desktopBanner}
                onFile={(f) => setFile("desktopBanner", f)}
                onClear={files.desktopBanner ? () => setFile("desktopBanner", null) : undefined}
                heightClass="h-36"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Mobile Banner <span className="text-red-500">*</span>
              </p>
              <p className="text-xs text-gray-400 mb-2">Recommended: 600×800px</p>
              <ImageDropzone
                label="mobile banner"
                file={files.mobileBanner}
                existingUrl={existing.mobileBanner}
                onFile={(f) => setFile("mobileBanner", f)}
                onClear={files.mobileBanner ? () => setFile("mobileBanner", null) : undefined}
                heightClass="h-36"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Action Image <span className="text-xs font-normal text-gray-400">(optional)</span>
              </p>
              <p className="text-xs text-gray-400 mb-2">Recommended: 200×200px — animated GIF supported</p>
              <ImageDropzone
                label="action image"
                file={files.actionImage}
                existingUrl={existing.actionImage}
                onFile={(f) => setFile("actionImage", f)}
                onClear={() => clearImage("actionImage")}
                heightClass="h-36"
              />
            </div>
          </div>

          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className={BUTTON_PRIMARY}>
              {saving ? "Saving…" : isEdit ? "Save Details" : "Create Campaign"}
            </button>
            <Link to="/admin/campaigns" className={BUTTON_SECONDARY}>
              Back to Campaigns
            </Link>
            {saved && <span className="text-sm font-medium text-green-600">Saved ✓</span>}
          </div>
        </form>

        {isEdit ? (
          <CampaignProductsPanel campaignId={id} />
        ) : (
          <div className={`${CARD_CLASS} p-8 flex flex-col items-center justify-center text-center gap-2`}>
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Campaign Products</p>
            <p className="text-xs text-gray-400 max-w-xs">
              Create the campaign first — you'll be able to search the catalog and add products right here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
