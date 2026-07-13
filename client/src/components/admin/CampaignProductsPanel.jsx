import { useState, useEffect, useRef } from "react";
import * as adminApi from "../../api/admin";
import { cloudinaryUrl } from "../../utils/cloudinaryUrl";
import { getDiscountedPrice } from "../../utils/pricing";
import Pagination from "../Pagination";
import { CARD_CLASS, INPUT_CLASS, LABEL_CLASS, BADGE_BASE } from "../../utils/ui";

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;
const PAGE_SIZE = 10;

// Selling price the special price must beat: base price after the product's own discount
function sellingPriceOf(product) {
  return getDiscountedPrice(product.basePrice, product).finalPrice;
}

function specialPriceError(product, raw) {
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return "Enter a valid price";
  const selling = sellingPriceOf(product);
  if (value >= selling) return `Must be lower than ${fmt(selling)}`;
  return null;
}

// Live management of a campaign's products: catalog search to add, a filter
// box to find products already in the campaign, and a server-paginated list
// (10 per page). Every action saves immediately — no form submit involved.
export default function CampaignProductsPanel({ campaignId }) {
  const [data, setData] = useState({ products: [], total: 0, totalInCampaign: 0, pages: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  // Filter over products already in the campaign (server-side, debounced)
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");

  // Catalog search to add new products
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState([]);
  const [addSearching, setAddSearching] = useState(false);
  const [addError, setAddError] = useState("");
  const addBoxRef = useRef(null);

  // Per-row edit state, keyed by product id
  const [edited, setEdited] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilter(filter.trim()), 300);
    return () => clearTimeout(t);
  }, [filter]);

  useEffect(() => {
    let active = true;
    adminApi.getCampaignProducts(campaignId, { page, search: debouncedFilter })
      .then((d) => {
        if (!active) return;
        setData(d);
        setError("");
        // Removing the last item of a trailing page leaves it empty — step back
        if (d.products.length === 0 && d.pages > 0 && page > d.pages) setPage(d.pages);
      })
      .catch((e) => { if (active) setError(e.response?.data?.message || "Failed to load campaign products"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [campaignId, page, debouncedFilter, refreshTick]);

  // Debounced catalog search for the add-product picker
  useEffect(() => {
    const q = addQuery.trim();
    const t = setTimeout(() => {
      if (!q) {
        setAddResults([]);
        setAddSearching(false);
        return;
      }
      adminApi.getProducts({ search: q, status: "active", limit: 8 })
        .then((d) => setAddResults(d.products))
        .catch(() => setAddResults([]))
        .finally(() => setAddSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [addQuery]);

  function refresh() {
    setRefreshTick((t) => t + 1);
  }

  async function handleAdd(product) {
    setAddError("");
    setBusyId(product._id);
    try {
      const { totalInCampaign } = await adminApi.addCampaignProduct(campaignId, { product: product._id });
      setAddQuery("");
      setAddResults([]);
      // New products land at the end of the list — jump there so it's visible
      setFilter("");
      setDebouncedFilter("");
      setPage(Math.max(1, Math.ceil(totalInCampaign / PAGE_SIZE)));
      refresh();
      addBoxRef.current?.focus();
    } catch (e) {
      setAddError(e.response?.data?.message || "Error adding product");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSavePrice(entry) {
    const pid = entry.product._id;
    const raw = edited[pid] ?? "";
    const clientError = specialPriceError(entry.product, raw);
    if (clientError) {
      setRowErrors((prev) => ({ ...prev, [pid]: clientError }));
      return;
    }
    setBusyId(pid);
    try {
      await adminApi.updateCampaignProduct(campaignId, pid, {
        specialPrice: raw === "" ? null : Number(raw),
      });
      setEdited((prev) => { const next = { ...prev }; delete next[pid]; return next; });
      setRowErrors((prev) => { const next = { ...prev }; delete next[pid]; return next; });
      refresh();
    } catch (e) {
      setRowErrors((prev) => ({ ...prev, [pid]: e.response?.data?.message || "Error saving price" }));
    } finally {
      setBusyId(null);
    }
  }

  async function handleMoveToTop(entry) {
    const pid = entry.product._id;
    setBusyId(pid);
    try {
      await adminApi.updateCampaignProduct(campaignId, pid, { moveToTop: true });
      setPage(1);
      refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Error reordering product");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(entry) {
    if (!window.confirm(`Remove "${entry.product.name}" from this campaign?`)) return;
    const pid = entry.product._id;
    setBusyId(pid);
    try {
      await adminApi.removeCampaignProduct(campaignId, pid);
      refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Error removing product");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={`${CARD_CLASS} p-5 sm:p-6 space-y-5`}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Campaign Products</h2>
          <span className={`${BADGE_BASE} bg-indigo-100 text-indigo-700`}>{data.totalInCampaign}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Changes save instantly. The first 10 products appear on the home screen.
        </p>
      </div>

      {/* Add from catalog */}
      <div className="relative">
        <label className={LABEL_CLASS}>Add a product</label>
        <input
          ref={addBoxRef}
          type="text"
          value={addQuery}
          onChange={(e) => {
            setAddQuery(e.target.value);
            setAddError("");
            if (e.target.value.trim()) setAddSearching(true);
          }}
          placeholder="Search the catalog by name…"
          className={INPUT_CLASS}
        />
        {addQuery.trim() && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-72 overflow-y-auto">
            {addSearching ? (
              <p className="px-3 py-2.5 text-sm text-gray-500">Searching…</p>
            ) : addResults.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-gray-500">No products found</p>
            ) : (
              addResults.map((product) => (
                <button
                  key={product._id}
                  type="button"
                  disabled={busyId === product._id}
                  onClick={() => handleAdd(product)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
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
                  <span className="text-xs font-medium text-brand-600 flex-shrink-0">+ Add</span>
                </button>
              ))
            )}
          </div>
        )}
        {addError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{addError}</p>}
      </div>

      {/* Filter products already in the campaign */}
      <div>
        <div className="relative">
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            placeholder="Search products in this campaign…"
            className={`${INPUT_CLASS} !pl-9`}
          />
        </div>
        {debouncedFilter && (
          <p className="text-xs text-gray-400 mt-1">
            {data.total} match{data.total === 1 ? "" : "es"} for “{debouncedFilter}”
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Paginated list */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : data.products.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          {debouncedFilter
            ? "No products in this campaign match your search."
            : "No products yet — search the catalog above to add some."}
        </p>
      ) : (
        <div className="space-y-2">
          {data.products.map((entry) => {
            const product = entry.product;
            const pid = product._id;
            const savedValue = entry.specialPrice == null ? "" : String(entry.specialPrice);
            const raw = edited[pid] ?? savedValue;
            const dirty = edited[pid] !== undefined && edited[pid] !== savedValue;
            const rowError = rowErrors[pid];
            const selling = sellingPriceOf(product);
            const special = raw === "" ? null : Number(raw);
            const percentOff =
              !rowError && special != null && Number.isFinite(special) && product.basePrice > 0 && special < selling
                ? Math.round(((product.basePrice - special) / product.basePrice) * 100)
                : null;
            return (
              <div
                key={pid}
                className="flex flex-wrap sm:flex-nowrap items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5"
              >
                <img
                  src={cloudinaryUrl(product.images?.[0]?.url, 80)}
                  alt=""
                  className="w-10 h-10 rounded object-cover bg-gray-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    Selling at {fmt(selling)}
                    {!product.isActive && (
                      <span className={`${BADGE_BASE} bg-gray-100 text-gray-500 ml-1.5`}>Inactive</span>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0 w-36">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={raw}
                      onChange={(e) => {
                        setEdited((prev) => ({ ...prev, [pid]: e.target.value }));
                        setRowErrors((prev) => { const next = { ...prev }; delete next[pid]; return next; });
                      }}
                      placeholder={`Special (< ${selling})`}
                      className={`${INPUT_CLASS} !py-1.5 ${rowError ? "!border-red-500" : ""}`}
                    />
                    {dirty && (
                      <button
                        type="button"
                        onClick={() => handleSavePrice(entry)}
                        disabled={busyId === pid}
                        title="Save special price"
                        className="flex-shrink-0 w-7 h-7 rounded-md bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {rowError ? (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{rowError}</p>
                  ) : dirty ? (
                    <p className="text-[11px] text-amber-600 mt-0.5">Unsaved — click ✓</p>
                  ) : percentOff !== null ? (
                    <p className="text-[11px] text-green-600 mt-0.5">{percentOff}% OFF</p>
                  ) : (
                    <p className="text-[11px] text-gray-400 mt-0.5">Empty = regular price</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveToTop(entry)}
                    disabled={busyId === pid}
                    title="Move to top (shows first on the storefront)"
                    className="w-7 h-7 rounded text-gray-400 hover:text-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center disabled:opacity-40"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 18.75l7.5-7.5 7.5 7.5M4.5 12l7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(entry)}
                    disabled={busyId === pid}
                    aria-label={`Remove ${product.name}`}
                    className="w-7 h-7 rounded text-gray-400 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center disabled:opacity-40"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} pages={data.pages} onChange={setPage} />
    </div>
  );
}
