import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import ImageDropzone from "../../components/admin/ImageDropzone";
import { cloudinaryUrl } from "../../utils/cloudinaryUrl";
import { getDiscountedPrice } from "../../utils/pricing";
import { CARD_CLASS, INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY, BUTTON_SECONDARY, BADGE_BASE } from "../../utils/ui";

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;

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

// Selling price the special price must beat: base price after the product's own discount
function sellingPriceOf(product) {
  return getDiscountedPrice(product.basePrice, product).finalPrice;
}

export default function CampaignFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
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

  // [{ product: {…full product…}, specialPrice: string }] — array order is display order
  const [items, setItems] = useState([]);

  // Product picker
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchBoxRef = useRef(null);
  const dragIndexRef = useRef(null);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    adminApi.getCampaign(id)
      .then(({ campaign }) => {
        setName(campaign.name);
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
        setItems(
          (campaign.products || [])
            .filter((entry) => entry.product) // product may have been deleted since
            .map((entry) => ({
              product: entry.product,
              specialPrice: entry.specialPrice == null ? "" : String(entry.specialPrice),
            }))
        );
      })
      .catch(() => setError("Failed to load campaign"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Debounced product search for the picker. `searching` flips on in the
  // input's onChange handler, so the dropdown shows "Searching…" immediately.
  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(() => {
      if (!q) {
        setResults([]);
        setSearching(false);
        return;
      }
      adminApi.getProducts({ search: q, status: "active", limit: 8 })
        .then((d) => setResults(d.products))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function setFile(field, file) {
    setFiles((prev) => ({ ...prev, [field]: file }));
  }

  function clearImage(field) {
    setFiles((prev) => ({ ...prev, [field]: null }));
    setExisting((prev) => ({ ...prev, [field]: "" }));
  }

  function addProduct(product) {
    if (items.some((i) => i.product._id === product._id)) return;
    setItems((prev) => [...prev, { product, specialPrice: "" }]);
    setQuery("");
    setResults([]);
    searchBoxRef.current?.focus();
  }

  function removeProduct(productId) {
    setItems((prev) => prev.filter((i) => i.product._id !== productId));
  }

  function setSpecialPrice(productId, value) {
    setItems((prev) =>
      prev.map((i) => (i.product._id === productId ? { ...i, specialPrice: value } : i))
    );
  }

  function priceError(item) {
    if (item.specialPrice === "") return null;
    const value = Number(item.specialPrice);
    if (!Number.isFinite(value) || value <= 0) return "Enter a valid price";
    const selling = sellingPriceOf(item.product);
    if (value >= selling) return `Must be lower than ${fmt(selling)}`;
    return null;
  }

  function handleItemDragStart(index) {
    dragIndexRef.current = index;
  }

  function handleItemDragOver(e, index) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = index;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Campaign name is required"); return; }
    if (!startDate) { setError("Start date is required"); return; }
    if (!endDate) { setError("End date is required"); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError("End date must be later than the start date"); return; }
    if (!files.desktopBanner && !existing.desktopBanner) { setError("A desktop banner image is required"); return; }
    if (!files.mobileBanner && !existing.mobileBanner) { setError("A mobile banner image is required"); return; }
    const invalid = items.find(priceError);
    if (invalid) {
      setError(`"${invalid.product.name}": ${priceError(invalid)}`);
      return;
    }

    setError("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("slug", slug.trim() || slugify(name));
      fd.append("startDate", new Date(startDate).toISOString());
      fd.append("endDate", new Date(endDate).toISOString());
      fd.append("buttonLabel", buttonLabel.trim());
      fd.append("themeColor", themeColor);
      fd.append("isActive", String(isActive));
      fd.append("isCancelled", String(isCancelled));
      fd.append(
        "products",
        JSON.stringify(
          items.map((i) => ({
            product: i.product._id,
            specialPrice: i.specialPrice === "" ? null : Number(i.specialPrice),
          }))
        )
      );
      for (const field of ["desktopBanner", "mobileBanner", "actionImage"]) {
        if (files[field]) fd.append(field, files[field]);
      }
      if (isEdit && !files.actionImage && !existing.actionImage) {
        fd.append("removeActionImage", "true");
      }

      if (isEdit) {
        await adminApi.updateCampaign(id, fd);
      } else {
        await adminApi.createCampaign(fd);
      }
      navigate("/admin/campaigns");
    } catch (err) {
      setError(err.response?.data?.message || "Error saving campaign");
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

  const statusBadge = status ? STATUS_BADGES[status] : null;

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

      <form onSubmit={handleSubmit} className={`${CARD_CLASS} p-5 sm:p-6 space-y-6`}>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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

        <SectionDivider label={`Campaign Products (${items.length})`} />

        {/* Product picker */}
        <div className="relative">
          <label className={LABEL_CLASS}>Add a product</label>
          <input
            ref={searchBoxRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setSearching(true);
            }}
            placeholder="Search products by name…"
            className={INPUT_CLASS}
          />
          {query.trim() && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-72 overflow-y-auto">
              {searching ? (
                <p className="px-3 py-2.5 text-sm text-gray-500">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-gray-500">No products found</p>
              ) : (
                results.map((product) => {
                  const alreadyAdded = items.some((i) => i.product._id === product._id);
                  return (
                    <button
                      key={product._id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addProduct(product)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <img
                        src={cloudinaryUrl(product.images?.[0]?.url, 80)}
                        alt=""
                        className="w-9 h-9 rounded object-cover bg-gray-100 flex-shrink-0"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-gray-900 dark:text-gray-100 truncate">{product.name}</span>
                        <span className="block text-xs text-gray-500">{fmt(sellingPriceOf(product))}</span>
                      </span>
                      {alreadyAdded && <span className="text-xs text-gray-400 flex-shrink-0">Added</span>}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400">
            No products yet — search above to add products to this campaign. The first 10 appear on the home screen.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => {
              const selling = sellingPriceOf(item.product);
              const err = priceError(item);
              const special = item.specialPrice === "" ? null : Number(item.specialPrice);
              const percentOff =
                !err && special != null && item.product.basePrice > 0
                  ? Math.round(((item.product.basePrice - special) / item.product.basePrice) * 100)
                  : null;
              return (
                <div
                  key={item.product._id}
                  draggable
                  onDragStart={() => handleItemDragStart(index)}
                  onDragOver={(e) => handleItemDragOver(e, index)}
                  onDrop={(e) => e.preventDefault()}
                  onDragEnd={() => { dragIndexRef.current = null; }}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5"
                >
                  <span className="cursor-grab text-gray-300 hover:text-gray-500 dark:text-gray-600 flex-shrink-0" title="Drag to reorder">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                    </svg>
                  </span>
                  <img
                    src={cloudinaryUrl(item.product.images?.[0]?.url, 80)}
                    alt=""
                    className="w-10 h-10 rounded object-cover bg-gray-100 flex-shrink-0 pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">Selling at {fmt(selling)}</p>
                  </div>
                  <div className="flex-shrink-0 w-40">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.specialPrice}
                      onChange={(e) => setSpecialPrice(item.product._id, e.target.value)}
                      placeholder={`Special (< ${selling})`}
                      className={`${INPUT_CLASS} !py-1.5 ${err ? "!border-red-500" : ""}`}
                    />
                    {err ? (
                      <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{err}</p>
                    ) : percentOff !== null ? (
                      <p className="text-[11px] text-green-600 mt-0.5">{percentOff}% OFF</p>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-0.5">Empty = regular price</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProduct(item.product._id)}
                    aria-label={`Remove ${item.product.name}`}
                    className="flex-shrink-0 text-gray-400 hover:text-red-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className={BUTTON_PRIMARY}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Campaign"}
          </button>
          <Link to="/admin/campaigns" className={BUTTON_SECONDARY}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
