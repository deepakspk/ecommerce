import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import ImageDropzone from "../../components/admin/ImageDropzone";
import { CARD_CLASS, INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY, BUTTON_SECONDARY } from "../../utils/ui";

// FormData image field name -> promotion document URL key
const IMAGE_FIELDS = {
  webBanner: "webBannerUrl",
  mobileBanner: "mobileBannerUrl",
  webPopup: "webPopupUrl",
  mobilePopup: "mobilePopupUrl",
};

function toDateInput(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

function SectionDivider({ label, action }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      {action}
      <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
    </div>
  );
}

export default function PromotionFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [visibleFrom, setVisibleFrom] = useState("");
  const [visibleUntil, setVisibleUntil] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Staged files (new uploads) and existing saved URLs (edit mode)
  const [files, setFiles] = useState({});
  const [existing, setExisting] = useState({});

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    adminApi.getPromotion(id)
      .then(({ promotion }) => {
        setTitle(promotion.title);
        setVisibleFrom(toDateInput(promotion.visibleFrom));
        setVisibleUntil(toDateInput(promotion.visibleUntil));
        setIsActive(promotion.isActive);
        setExisting({
          webBanner: promotion.webBannerUrl || "",
          mobileBanner: promotion.mobileBannerUrl || "",
          webPopup: promotion.webPopupUrl || "",
          mobilePopup: promotion.mobilePopupUrl || "",
        });
      })
      .catch(() => setError("Failed to load promotion"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function setFile(field, file) {
    setFiles((prev) => ({ ...prev, [field]: file }));
  }

  function clearImage(field) {
    setFiles((prev) => ({ ...prev, [field]: null }));
    setExisting((prev) => ({ ...prev, [field]: "" }));
  }

  const hasPopup = Boolean(files.webPopup || files.mobilePopup || existing.webPopup || existing.mobilePopup);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (!visibleFrom) { setError("Visible From date is required"); return; }
    if (!visibleUntil) { setError("Visible Until date is required"); return; }
    if (visibleUntil < visibleFrom) { setError("Visible Until must be on or after Visible From"); return; }
    if (!files.webBanner && !existing.webBanner) { setError("A web banner image is required"); return; }

    setError("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      // The promotion runs the full final day, so "until" is end-of-day
      fd.append("visibleFrom", `${visibleFrom}T00:00:00`);
      fd.append("visibleUntil", `${visibleUntil}T23:59:59`);
      fd.append("isActive", String(isActive));
      for (const field of Object.keys(IMAGE_FIELDS)) {
        if (files[field]) fd.append(field, files[field]);
      }
      if (isEdit) {
        // Flag optional images the admin removed without replacing
        for (const field of ["mobileBanner", "webPopup", "mobilePopup"]) {
          if (!files[field] && !existing[field]) {
            fd.append(`remove${field[0].toUpperCase()}${field.slice(1)}`, "true");
          }
        }
        await adminApi.updatePromotion(id, fd);
      } else {
        await adminApi.createPromotion(fd);
      }
      navigate("/admin/promotions");
    } catch (e) {
      setError(e.response?.data?.message || "Error saving promotion");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl">
        <div className={`${CARD_CLASS} p-6 animate-pulse space-y-4`}>
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
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
        <nav className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Link to="/admin/dashboard" className="hover:text-brand-600">Dashboard</Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <Link to="/admin/promotions" className="hover:text-brand-600">Promotions</Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-gray-900 dark:text-gray-100 font-medium">
            {isEdit ? "Edit Promotion" : "New Promotion"}
          </span>
        </nav>
      </div>

      <form onSubmit={handleSubmit} className={`${CARD_CLASS} p-5 sm:p-6 space-y-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dashain Festival Sale"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Visible From *</label>
            <input
              type="date"
              value={visibleFrom}
              onChange={(e) => setVisibleFrom(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Visible Until *</label>
            <input
              type="date"
              value={visibleUntil}
              onChange={(e) => setVisibleUntil(e.target.value)}
              min={visibleFrom || undefined}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex items-end pb-1.5">
            <Toggle checked={isActive} onChange={setIsActive} label="Is Active?" />
          </div>
        </div>

        <SectionDivider label="Banner Images" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Web Banner <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-gray-400 mb-2">Recommended: 1200×300px (4:1 landscape)</p>
            <ImageDropzone
              label="web banner"
              file={files.webBanner}
              existingUrl={existing.webBanner}
              onFile={(f) => setFile("webBanner", f)}
              onClear={files.webBanner ? () => setFile("webBanner", null) : undefined}
              heightClass="h-32"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Mobile Banner</p>
            <p className="text-xs text-gray-400 mb-2">Recommended: 800×400px (2:1)</p>
            <ImageDropzone
              label="mobile banner"
              file={files.mobileBanner}
              existingUrl={existing.mobileBanner}
              onFile={(f) => setFile("mobileBanner", f)}
              onClear={() => clearImage("mobileBanner")}
              heightClass="h-32"
            />
          </div>
        </div>

        <SectionDivider
          label="Popup Images"
          action={
            hasPopup ? (
              <button
                type="button"
                onClick={() => { clearImage("webPopup"); clearImage("mobilePopup"); }}
                className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Remove
              </button>
            ) : null
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Web Popup <span className="text-xs font-normal text-gray-400">(optional)</span>
            </p>
            <p className="text-xs text-gray-400 mb-2">Recommended: 500×600px portrait</p>
            <ImageDropzone
              label="web popup"
              file={files.webPopup}
              existingUrl={existing.webPopup}
              onFile={(f) => setFile("webPopup", f)}
              onClear={() => clearImage("webPopup")}
              heightClass="h-44"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Mobile Popup <span className="text-xs font-normal text-gray-400">(optional)</span>
            </p>
            <p className="text-xs text-gray-400 mb-2">Recommended: 360×480px portrait</p>
            <ImageDropzone
              label="mobile popup"
              file={files.mobilePopup}
              existingUrl={existing.mobilePopup}
              onFile={(f) => setFile("mobilePopup", f)}
              onClear={() => clearImage("mobilePopup")}
              heightClass="h-44"
            />
          </div>
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className={BUTTON_PRIMARY}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Promotion"}
          </button>
          <Link to="/admin/promotions" className={BUTTON_SECONDARY}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
