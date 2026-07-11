import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import * as adminApi from "../../api/admin";
import { getErrorMessage } from "../../utils/errorHelpers";
import Badge from "../../components/Badge";
import Pagination from "../../components/Pagination";
import EmptyState from "../../components/EmptyState";
import ClearFiltersButton from "../../components/admin/ClearFiltersButton";
import TableSkeleton from "../../components/admin/TableSkeleton";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import {
  CARD_CLASS,
  INPUT_CLASS,
  FILTER_BAR_CLASS,
  FILTER_FIELD_CLASS,
  BUTTON_SECONDARY,
  BUTTON_DANGER,
} from "../../utils/ui";

const ALL_STATUSES = ["NEW", "READ", "RESOLVED"];

function fmtDateTime(d) {
  return new Date(d).toLocaleString("en-NP", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";

  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selected, setSelected] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = { page, limit: 10 };
        if (statusFilter) params.status = statusFilter;
        if (search.trim()) params.search = search.trim();
        if (from) params.from = from;
        if (to) params.to = to;
        const data = await adminApi.listContactMessages(params);
        if (!active) return;
        setMessages(data.messages);
        setTotal(data.total);
        setNewCount(data.newCount);
        setPages(data.pages);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [statusFilter, search, from, to, page]);

  function setFilter(status) {
    if (status) setSearchParams({ status });
    else setSearchParams({});
    setPage(1);
  }

  const hasFilters = search || from || to || statusFilter;

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setFrom("");
    setTo("");
    setFilter("");
  }

  function patchLocal(updated) {
    setMessages((list) => list.map((m) => (m._id === updated._id ? updated : m)));
  }

  async function openMessage(message) {
    setActionError("");
    setSelected(message);
    try {
      // Fetching marks NEW messages as READ on the server.
      const { contactMessage } = await adminApi.getContactMessage(message._id);
      setSelected(contactMessage);
      patchLocal(contactMessage);
      if (message.status === "NEW") setNewCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  async function changeStatus(message, status) {
    setActing(true);
    setActionError("");
    try {
      const { contactMessage } = await adminApi.updateContactMessageStatus(message._id, status);
      setSelected(contactMessage);
      patchLocal(contactMessage);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    setActing(true);
    setActionError("");
    try {
      await adminApi.deleteContactMessage(confirmDelete._id);
      setMessages((list) => list.filter((m) => m._id !== confirmDelete._id));
      setTotal((t) => t - 1);
      if (confirmDelete.status === "NEW") setNewCount((c) => Math.max(0, c - 1));
      setConfirmDelete(null);
      setSelected(null);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <AdminPageHeader
        title="Messages"
        loading={loading}
        subtitle={`${total} message${total !== 1 ? "s" : ""}${newCount ? ` · ${newCount} new` : ""}`}
      />

      <div className="flex gap-1 mb-5 flex-wrap">
        <FilterTab label="All" active={!statusFilter} onClick={() => setFilter("")} />
        {ALL_STATUSES.map((s) => (
          <FilterTab
            key={s}
            label={s === "NEW" && newCount ? `NEW (${newCount})` : s}
            active={statusFilter === s}
            onClick={() => setFilter(s)}
          />
        ))}
      </div>

      <div className={FILTER_BAR_CLASS}>
        <div className={FILTER_FIELD_CLASS}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone, message"
            className={INPUT_CLASS}
          />
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2 text-xs text-gray-500">
          Date
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={`${INPUT_CLASS} w-36`} />
          <span>–</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={`${INPUT_CLASS} w-36`} />
        </div>
        <ClearFiltersButton show={hasFilters} onClick={clearFilters} />
      </div>

      {loading ? (
        <TableSkeleton columns={5} />
      ) : messages.length === 0 ? (
        <EmptyState title="No messages match these filters." />
      ) : (
        <>
          <div className={`${CARD_CLASS} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/60 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">From</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Message</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Received</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {messages.map((m) => (
                    <tr
                      key={m._id}
                      onClick={() => openMessage(m)}
                      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                        m.status === "NEW" ? "bg-amber-50/50 dark:bg-amber-900/10" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <p className={`${m.status === "NEW" ? "font-semibold" : "font-medium"} text-gray-900 dark:text-gray-100`}>
                          {m.name || m.userId?.name || "—"}
                        </p>
                        <p className="text-xs text-gray-400">{m.email}</p>
                        {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 max-w-sm">
                        <p className="truncate">{m.message}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDateTime(m.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Badge kind="message" status={m.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-brand-600 hover:underline text-xs font-medium">View</span>
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

      {/* Detail modal */}
      {selected && !confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !acting && setSelected(null)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                  {selected.name || selected.userId?.name || "Customer message"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Received {fmtDateTime(selected.createdAt)}</p>
              </div>
              <Badge kind="message" status={selected.status} />
            </div>

            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Email</dt>
                <dd className="text-gray-800 dark:text-gray-200 break-all">{selected.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Phone</dt>
                <dd className="text-gray-800 dark:text-gray-200">{selected.phone || "—"}</dd>
              </div>
              {selected.userId && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-400">Account</dt>
                  <dd className="text-gray-800 dark:text-gray-200">
                    {selected.userId.name} ({selected.userId.email || selected.userId.phone})
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">
              {selected.message}
            </div>

            {actionError && <p className="text-red-600 text-xs mt-3">{actionError}</p>}

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`mailto:${selected.email}?subject=${encodeURIComponent("Re: your message to our support team")}`}
                className="bg-brand-600 text-white rounded-md py-2 px-4 text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Reply by Email
              </a>
              {selected.status !== "RESOLVED" ? (
                <button
                  type="button"
                  onClick={() => changeStatus(selected, "RESOLVED")}
                  disabled={acting}
                  className={BUTTON_SECONDARY}
                >
                  {acting ? "Please wait…" : "Mark Resolved"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => changeStatus(selected, "READ")}
                  disabled={acting}
                  className={BUTTON_SECONDARY}
                >
                  {acting ? "Please wait…" : "Reopen"}
                </button>
              )}
              <button
                type="button"
                onClick={() => { setActionError(""); setConfirmDelete(selected); }}
                disabled={acting}
                className={BUTTON_DANGER}
              >
                Delete
              </button>
              <button type="button" onClick={() => setSelected(null)} disabled={acting} className={`ml-auto ${BUTTON_SECONDARY}`}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !acting && setConfirmDelete(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">Delete message?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              This will permanently delete the message from {confirmDelete.name || confirmDelete.email}. This cannot be undone.
            </p>

            {actionError && <p className="text-red-600 text-xs mb-3">{actionError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={acting}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {acting ? "Please wait…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={acting}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? "bg-gray-900 text-white dark:bg-brand-600"
          : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      }`}
    >
      {label}
    </button>
  );
}
