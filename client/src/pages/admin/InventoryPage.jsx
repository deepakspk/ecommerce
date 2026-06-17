import { useState, useEffect } from "react";
import * as adminApi from "../../api/admin";

const LOW_STOCK = 5;

export default function InventoryPage() {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(null);
  const [adjForm, setAdjForm] = useState({ change: "", reason: "" });
  const [adjError, setAdjError] = useState("");
  const [adjSaving, setAdjSaving] = useState(false);

  async function load() {
    try {
      const data = await adminApi.getInventory();
      setVariants(data.variants);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

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

  const lowCount = variants.filter(v => v.stockQuantity < LOW_STOCK).length;

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Inventory</h1>
      <p className="text-sm text-gray-500 mb-6">
        {lowCount > 0
          ? <span className="text-amber-700 font-medium">{lowCount} variant{lowCount > 1 ? "s" : ""} below {LOW_STOCK} units</span>
          : "All variants have sufficient stock."}
        {" "}<span className="text-gray-400">— sorted by stock quantity (lowest first)</span>
      </p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : variants.length === 0 ? (
        <p className="text-gray-400 text-sm">No variants found. Create products and add variants first.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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
                        className="text-blue-600 hover:underline text-xs font-medium"
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
      )}

      {/* Adjust stock modal */}
      {adjusting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {adjError && <p className="text-red-600 text-xs">{adjError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={adjSaving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
    </div>
  );
}
