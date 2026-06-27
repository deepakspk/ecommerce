import { useState, useEffect } from "react";
import * as adminApi from "../../api/admin";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import ClearFiltersButton from "../../components/admin/ClearFiltersButton";
import TableSkeleton from "../../components/admin/TableSkeleton";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { CARD_CLASS, INPUT_CLASS, FILTER_BAR_CLASS, FILTER_FIELD_CLASS } from "../../utils/ui";

const EMPTY_FORM = {
  code: "",
  type: "PERCENTAGE",
  value: "",
  minOrderValue: "",
  maxDiscountAmount: "",
  usageLimit: "",
  perUserLimit: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;
const toDateInput = (iso) => (iso ? iso.slice(0, 10) : "");

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [validity, setValidity] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function load() {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (type) params.type = type;
      if (validity) params.validity = validity;
      const data = await adminApi.getCoupons(params);
      setCoupons(data.coupons);
      setTotal(data.total);
      setPages(data.pages);
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, search, status, type, validity]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(coupon) {
    setEditId(coupon._id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minOrderValue: String(coupon.minOrderValue ?? 0),
      maxDiscountAmount: coupon.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : "",
      usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
      perUserLimit: coupon.perUserLimit != null ? String(coupon.perUserLimit) : "",
      startsAt: toDateInput(coupon.startsAt),
      expiresAt: toDateInput(coupon.expiresAt),
      isActive: coupon.isActive,
    });
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.code.trim()) {
      setFormError("Code is required");
      return;
    }
    if (!form.value) {
      setFormError("Value is required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        code: form.code.trim(),
        type: form.type,
        value: Number(form.value),
        minOrderValue: form.minOrderValue === "" ? 0 : Number(form.minOrderValue),
        maxDiscountAmount: form.maxDiscountAmount === "" ? null : Number(form.maxDiscountAmount),
        usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
        perUserLimit: form.perUserLimit === "" ? null : Number(form.perUserLimit),
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
        isActive: form.isActive,
      };
      if (editId) {
        await adminApi.updateCoupon(editId, payload);
      } else {
        await adminApi.createCoupon(payload);
      }
      closeForm();
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Error saving coupon");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(coupon) {
    try {
      await adminApi.updateCoupon(coupon._id, { isActive: !coupon.isActive });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Error updating coupon");
    }
  }

  async function handleDelete(coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"?`)) return;
    try {
      await adminApi.deleteCoupon(coupon._id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Error deleting coupon");
    }
  }

  const hasFilters = search || status || type || validity;

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setType("");
    setValidity("");
    setPage(1);
  }

  return (
    <div className="p-4 sm:p-8">
      <AdminPageHeader
        title="Coupons"
        loading={loading}
        subtitle={`${total} coupon${total !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={openCreate}
            className="bg-white text-brand-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors shadow-sm"
          >
            + New Coupon
          </button>
        }
      />

      <div className={FILTER_BAR_CLASS}>
        <div className={FILTER_FIELD_CLASS}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by code"
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={INPUT_CLASS}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Disabled</option>
          </select>
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className={INPUT_CLASS}>
            <option value="">All types</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed</option>
          </select>
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select value={validity} onChange={(e) => { setValidity(e.target.value); setPage(1); }} className={INPUT_CLASS}>
            <option value="">Any validity</option>
            <option value="current">Currently valid</option>
            <option value="upcoming">Upcoming</option>
            <option value="expired">Expired</option>
            <option value="none">No date range</option>
          </select>
        </div>
        <ClearFiltersButton show={hasFilters} onClick={clearFilters} />
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <TableSkeleton columns={7} />
      ) : coupons.length === 0 ? (
        <EmptyState title={hasFilters ? "No coupons match these filters." : "No coupons yet."} />
      ) : (
        <>
        <div className={`${CARD_CLASS} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/60 dark:border-gray-700">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Discount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Min Order</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Usage</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Validity</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {coupons.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="px-5 py-3 font-mono font-semibold text-gray-900 dark:text-gray-100">{c.code}</td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-200">
                      {c.type === "PERCENTAGE" ? `${c.value}%` : fmt(c.value)}
                      {c.maxDiscountAmount != null && (
                        <span className="text-gray-400"> (max {fmt(c.maxDiscountAmount)})</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{c.minOrderValue ? fmt(c.minOrderValue) : "—"}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {c.usedCount}
                      {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                      {c.perUserLimit != null && (
                        <span className="text-gray-400"> ({c.perUserLimit}/user)</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {c.startsAt ? new Date(c.startsAt).toLocaleDateString() : "Anytime"}
                      {" – "}
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "No expiry"}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {c.isActive ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(c)} className="text-brand-600 hover:underline text-xs mr-3">Edit</button>
                      <button onClick={() => handleDelete(c)} className="text-red-600 hover:underline text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination page={page} pages={pages} onChange={setPage} />
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeForm}>
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">{editId ? "Edit Coupon" : "New Coupon"}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. WELCOME10"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Value {form.type === "PERCENTAGE" ? "(%)" : "(Rs.)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={form.type === "PERCENTAGE" ? 100 : undefined}
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Order Value (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minOrderValue}
                    onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Discount (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.maxDiscountAmount}
                    onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: e.target.value }))}
                    placeholder="No cap"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={form.usageLimit}
                    onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                    placeholder="Unlimited"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Per-User Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={form.perUserLimit}
                    onChange={(e) => setForm((f) => ({ ...f, perUserLimit: e.target.value }))}
                    placeholder="Unlimited"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Starts At</label>
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expires At</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="couponActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="couponActive" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
              </div>

              {formError && <p className="text-red-600 text-xs">{formError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving…" : editId ? "Save Changes" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
