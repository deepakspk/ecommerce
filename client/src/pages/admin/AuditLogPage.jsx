import { useState, useEffect } from "react";
import * as adminApi from "../../api/admin";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import ClearFiltersButton from "../../components/admin/ClearFiltersButton";
import TableSkeleton from "../../components/admin/TableSkeleton";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { CARD_CLASS, INPUT_CLASS, FILTER_BAR_CLASS, FILTER_FIELD_CLASS } from "../../utils/ui";

const ACTIONS = [
  "USER_ROLE_CHANGE",
  "USER_STATUS_CHANGE",
  "USER_CREATED",
  "USER_PROFILE_UPDATE",
  "STOCK_ADJUSTMENT",
  "ORDER_STATUS_CHANGE",
  "ORDER_CREATED_MANUAL",
  "PRODUCT_DELETE",
  "SYSTEM_SETTINGS_UPDATE",
  "COMPANY_SETTINGS_UPDATE",
  "THEME_SETTINGS_UPDATE",
];

const TARGET_TYPES = ["User", "Order", "Product", "ProductVariant", "SystemSetting", "CompanySettings", "ThemeSettings"];

function fmtDateTime(d) {
  return new Date(d).toLocaleString("en-NP", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function describeMeta(log) {
  const m = log.meta || {};
  switch (log.action) {
    case "USER_ROLE_CHANGE":
      return `${m.targetName || m.targetEmail || "user"}: ${m.previousRole} → ${m.newRole}`;
    case "USER_STATUS_CHANGE":
      return `${m.targetName || m.targetEmail || "user"}: ${m.previousStatus} → ${m.newStatus}`;
    case "STOCK_ADJUSTMENT":
      return `${m.change > 0 ? "+" : ""}${m.change} (${m.previousStock} → ${m.newStock}) — ${m.reason}`;
    case "ORDER_STATUS_CHANGE":
      return `${m.previousStatus} → ${m.newStatus}`;
    case "ORDER_CREATED_MANUAL":
      return `${m.customerName || "customer"} — ${m.total != null ? `Rs. ${Number(m.total).toLocaleString()}` : ""}`;
    case "USER_CREATED":
      return `${m.name || m.email || "user"} (${m.role})`;
    case "PRODUCT_DELETE":
      return m.name || "";
    case "SYSTEM_SETTINGS_UPDATE":
      return `${m.group}: ${(m.changedKeys || []).map((c) => `${c.key}=${c.value}`).join(", ")}`;
    case "COMPANY_SETTINGS_UPDATE":
      return `Updated: ${(m.changedKeys || []).join(", ")}`;
    case "THEME_SETTINGS_UPDATE":
      return `Updated: ${(m.changedKeys || []).join(", ")}`;
    default:
      return JSON.stringify(m);
  }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [adminSearchInput, setAdminSearchInput] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setAdminSearch(adminSearchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [adminSearchInput]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = { page, limit: 10 };
        if (adminSearch.trim()) params.adminSearch = adminSearch.trim();
        if (action) params.action = action;
        if (targetType) params.targetType = targetType;
        if (from) params.from = from;
        if (to) params.to = to;
        const data = await adminApi.listAuditLog(params);
        if (!active) return;
        setLogs(data.logs);
        setTotal(data.total);
        setPages(data.pages);
        setError("");
      } catch (e) {
        if (active) setError(e.response?.data?.message || "Failed to load audit log");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, adminSearch, action, targetType, from, to]);

  const hasFilters = adminSearch || action || targetType || from || to;

  function clearFilters() {
    setAdminSearchInput("");
    setAdminSearch("");
    setAction("");
    setTargetType("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <div className="p-4 sm:p-8">
      <AdminPageHeader
        title="Audit Log"
        loading={loading}
        subtitle={`${total} entr${total !== 1 ? "ies" : "y"}`}
      />

      <div className={FILTER_BAR_CLASS}>
        <div className={FILTER_FIELD_CLASS}>
          <input
            value={adminSearchInput}
            onChange={(e) => setAdminSearchInput(e.target.value)}
            placeholder="Search by admin name or email"
            className={INPUT_CLASS}
          />
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className={INPUT_CLASS}
          >
            <option value="">All actions</option>
            {ACTIONS.map(a => (
              <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
            className={INPUT_CLASS}
          >
            <option value="">All target types</option>
            {TARGET_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2 text-xs text-gray-500">
          Date
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className={`${INPUT_CLASS} w-36`}
          />
          <span>–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className={`${INPUT_CLASS} w-36`}
          />
        </div>
        <ClearFiltersButton show={hasFilters} onClick={clearFilters} />
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <TableSkeleton columns={4} />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit log entries found." />
      ) : (
        <>
          <div className={`${CARD_CLASS} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map(log => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{log.adminUserId?.name || "—"}</p>
                        <p className="text-xs text-gray-400">{log.adminUserId?.email}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-700 text-xs font-mono">{log.action}</td>
                      <td className="px-5 py-3 text-gray-600 text-xs">{describeMeta(log)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={page} pages={pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
