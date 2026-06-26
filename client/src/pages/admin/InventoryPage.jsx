import { useState, useEffect } from "react";
import * as adminApi from "../../api/admin";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import ClearFiltersButton from "../../components/admin/ClearFiltersButton";
import TableSkeleton from "../../components/admin/TableSkeleton";
import { H1_CLASS, CARD_CLASS, INPUT_CLASS, FILTER_BAR_CLASS, FILTER_FIELD_CLASS } from "../../utils/ui";

const LOW_STOCK = 5;

function ProductPicker({ selected, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let active = true;
    setSearching(true);
    const t = setTimeout(() => {
      adminApi.getProducts({ search: query.trim(), limit: 8 })
        .then(({ products }) => { if (active) setResults(products); })
        .catch(() => { if (active) setResults([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50">
        <span className="font-medium text-gray-900">{selected.name}</span>
        <button type="button" onClick={() => onSelect(null)} className="text-xs text-brand-600 hover:underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search product by name…"
        className={INPUT_CLASS}
      />
      {open && query.trim() && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {searching ? (
            <p className="px-3 py-2 text-xs text-gray-400">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">No products found.</p>
          ) : (
            results.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => { onSelect(p); setOpen(false); setQuery(""); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              >
                {p.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_VARIANT_FORM = { size: "", color: "", sku: "", price: "", stockQuantity: "" };

export default function InventoryPage() {
  const [variants, setVariants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [lowCount, setLowCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [sort, setSort] = useState("stock_asc");

  const [adjusting, setAdjusting] = useState(null);
  const [adjForm, setAdjForm] = useState({ change: "", reason: "" });
  const [adjError, setAdjError] = useState("");
  const [adjSaving, setAdjSaving] = useState(false);

  const [showAddVariant, setShowAddVariant] = useState(false);
  const [addProduct, setAddProduct] = useState(null);
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT_FORM);
  const [variantError, setVariantError] = useState("");
  const [variantSaving, setVariantSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function load() {
    setLoading(true);
    try {
      const params = { page, limit: 10, sort };
      if (search.trim()) params.search = search.trim();
      if (stockStatus) params.stockStatus = stockStatus;
      const data = await adminApi.getInventory(params);
      setVariants(data.variants);
      setTotal(data.total);
      setPages(data.pages);
      setLowCount(data.lowCount);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, search, stockStatus, sort]);

  function openAdjust(v) {
    setAdjusting(v);
    setAdjForm({ change: "", reason: "" });
    setAdjError("");
  }

  async function handleAdjust(e) {
    e.preventDefault();
    if (!adjForm.change || !adjForm.reason.trim()) {
      setAdjError("Both fields are required");
      return;
    }
    setAdjSaving(true);
    setAdjError("");
    try {
      const { variant } = await adminApi.adjustStock(adjusting._id, {
        change: Number(adjForm.change),
        reason: adjForm.reason.trim(),
      });
      setVariants(vs =>
        vs.map(v => v._id === variant._id ? { ...v, stockQuantity: variant.stockQuantity } : v)
      );
      setAdjusting(null);
    } catch (e) {
      setAdjError(e.response?.data?.message || "Error adjusting stock");
    } finally {
      setAdjSaving(false);
    }
  }

  function openAddVariant() {
    setAddProduct(null);
    setVariantForm(EMPTY_VARIANT_FORM);
    setVariantError("");
    setShowAddVariant(true);
  }

  async function handleAddVariant(e) {
    e.preventDefault();
    if (!addProduct) {
      setVariantError("Select a product first");
      return;
    }
    if (!variantForm.size.trim() || !variantForm.color.trim() || !variantForm.sku.trim()) {
      setVariantError("Size, color, and SKU are required");
      return;
    }
    setVariantSaving(true);
    setVariantError("");
    try {
      await adminApi.addVariant(addProduct._id, {
        size: variantForm.size.trim(),
        color: variantForm.color.trim(),
        sku: variantForm.sku.trim(),
        price: variantForm.price === "" ? undefined : Number(variantForm.price),
        stockQuantity: variantForm.stockQuantity === "" ? 0 : Number(variantForm.stockQuantity),
      });
      setShowAddVariant(false);
      await load();
    } catch (e) {
      setVariantError(e.response?.data?.message || "Error creating variant");
    } finally {
      setVariantSaving(false);
    }
  }

  const hasFilters = search || stockStatus;

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStockStatus("");
    setPage(1);
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className={H1_CLASS}>Inventory</h1>
          {!loading && <p className="text-sm text-gray-400 mt-0.5">{total} variant{total !== 1 ? "s" : ""}</p>}
        </div>
        <button
          onClick={openAddVariant}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          + Add Variant
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {lowCount > 0
          ? <span className="text-amber-700 font-medium">{lowCount} variant{lowCount > 1 ? "s" : ""} below {LOW_STOCK} units</span>
          : "All variants have sufficient stock."}
      </p>

      <div className={FILTER_BAR_CLASS}>
        <div className={FILTER_FIELD_CLASS}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by product name or SKU"
            className={INPUT_CLASS}
          />
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value); setPage(1); }} className={INPUT_CLASS}>
            <option value="">All stock levels</option>
            <option value="low">Low stock (&lt; {LOW_STOCK})</option>
            <option value="out">Out of stock</option>
            <option value="in">In stock</option>
          </select>
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={INPUT_CLASS}>
            <option value="stock_asc">Stock: low to high</option>
            <option value="stock_desc">Stock: high to low</option>
          </select>
        </div>
        <ClearFiltersButton show={hasFilters} onClick={clearFilters} />
      </div>

      {loading ? (
        <TableSkeleton columns={5} />
      ) : variants.length === 0 ? (
        <EmptyState title={hasFilters ? "No variants match these filters." : "No variants found. Create products and add variants first."} />
      ) : (
        <>
          <div className={`${CARD_CLASS} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Variant</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map(v => {
                  const low = v.stockQuantity < LOW_STOCK;
                  return (
                    <tr key={v._id} className={low ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{v.productId?.name || "—"}</p>
                        {!v.productId?.isActive && (
                          <span className="text-xs text-gray-400">Inactive</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {v.size} / {v.color}
                      </td>
                      <td className="px-5 py-3 text-gray-400 font-mono text-xs">{v.sku}</td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold text-base ${low ? "text-amber-700" : "text-gray-900"}`}>
                          {v.stockQuantity}
                        </span>
                        {low && (
                          <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                            Low stock
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => openAdjust(v)}
                          className="text-brand-600 hover:underline text-xs font-medium"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>

          <Pagination page={page} pages={pages} onChange={setPage} />
        </>
      )}

      {/* Adjust stock modal */}
      {adjusting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">Adjust Stock</h3>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-800">{adjusting.productId?.name}</span>{" "}
              — {adjusting.size} / {adjusting.color}
              <br />
              <span className="text-xs">Current stock: <strong>{adjusting.stockQuantity}</strong></span>
            </p>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Change amount</label>
                <input
                  type="number"
                  value={adjForm.change}
                  onChange={e => setAdjForm(f => ({ ...f, change: e.target.value }))}
                  placeholder="e.g. 10 or -3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Use a negative number to reduce stock.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={adjForm.reason}
                  onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Manual restock, damaged goods…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
              {adjError && <p className="text-red-600 text-xs">{adjError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={adjSaving}
                  className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {adjSaving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjusting(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add variant modal */}
      {showAddVariant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !variantSaving && setShowAddVariant(false)}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-4">Add Variant</h3>
            <form onSubmit={handleAddVariant} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <ProductPicker selected={addProduct} onSelect={setAddProduct} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <input value={variantForm.size} onChange={(e) => setVariantForm(f => ({ ...f, size: e.target.value }))} className={INPUT_CLASS} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input value={variantForm.color} onChange={(e) => setVariantForm(f => ({ ...f, color: e.target.value }))} className={INPUT_CLASS} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input value={variantForm.sku} onChange={(e) => setVariantForm(f => ({ ...f, sku: e.target.value }))} className={`${INPUT_CLASS} font-mono`} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (optional)</label>
                  <input type="number" min="0" value={variantForm.price} onChange={(e) => setVariantForm(f => ({ ...f, price: e.target.value }))} placeholder="Uses base price" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial stock</label>
                  <input type="number" min="0" value={variantForm.stockQuantity} onChange={(e) => setVariantForm(f => ({ ...f, stockQuantity: e.target.value }))} placeholder="0" className={INPUT_CLASS} />
                </div>
              </div>
              {variantError && <p className="text-red-600 text-xs">{variantError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={variantSaving}
                  className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {variantSaving ? "Saving…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddVariant(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
