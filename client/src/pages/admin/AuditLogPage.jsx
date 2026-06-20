import { useState, useEffect } from "react";
import * as adminApi from "../../api/admin";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import { H1_CLASS, CARD_CLASS, INPUT_CLASS } from "../../utils/ui";

const ACTIONS = [
  "USER_ROLE_CHANGE",
  "USER_STATUS_CHANGE",
  "STOCK_ADJUSTMENT",
  "ORDER_STATUS_CHANGE",
  "PRODUCT_DELETE",
  "SYSTEM_SETTINGS_UPDATE",
  "COMPANY_SETTINGS_UPDATE",
  "THEME_SETTINGS_UPDATE",
];

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

  const [adminSearch, setAdminSearch] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = { page, limit: 30 };
        if (adminSearch.trim()) params.adminSearch = adminSearch.trim();
        if (action) params.action = action;
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
  }, [page, adminSearch, action, from, to]);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={H1_CLASS}>Audit Log</h1>
          {!loading && <p className="text-sm text-gray-400 mt-0.5">{total} entr{total !== 1 ? "ies" : "y"}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={adminSearch}
          onChange={(e) => { setAdminSearch(e.target.value); setPage(1); }}
          placeholder="Search by admin name or email"
          className={`${INPUT_CLASS} max-w-xs`}
        />
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className={`${INPUT_CLASS} w-auto`}
        >
          <option value="">All actions</option>
          {ACTIONS.map(a => (
            <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className={`${INPUT_CLASS} w-auto`}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className={`${INPUT_CLASS} w-auto`}
        />
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
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
