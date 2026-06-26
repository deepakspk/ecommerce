import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as adminApi from "../../api/admin";
import Badge from "../../components/Badge";
import Pagination from "../../components/Pagination";
import EmptyState from "../../components/EmptyState";
import ClearFiltersButton from "../../components/admin/ClearFiltersButton";
import TableSkeleton from "../../components/admin/TableSkeleton";
import { H1_CLASS, CARD_CLASS, INPUT_CLASS, FILTER_BAR_CLASS, FILTER_FIELD_CLASS } from "../../utils/ui";

const ALL_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "PICKED_UP", "REFUNDED"];

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NP", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminReturnsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";

  const [returns, setReturns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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
        const data = await adminApi.listAdminReturns(params);
        if (!active) return;
        setReturns(data.returns);
        setTotal(data.total);
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

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={H1_CLASS}>Returns</h1>
          {!loading && <p className="text-sm text-gray-400 mt-0.5">{total} request{total !== 1 ? "s" : ""}</p>}
        </div>
      </div>

      <div className="flex gap-1 mb-5 flex-wrap">
        <FilterTab label="All" active={!statusFilter} onClick={() => setFilter("")} />
        {ALL_STATUSES.map(s => (
          <FilterTab key={s} label={s.replace("_", " ")} active={statusFilter === s} onClick={() => setFilter(s)} />
        ))}
      </div>

      <div className={FILTER_BAR_CLASS}>
        <div className={FILTER_FIELD_CLASS}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by customer name or email"
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
        <TableSkeleton columns={6} />
      ) : returns.length === 0 ? (
        <EmptyState title="No return requests match these filters." />
      ) : (
        <>
          <div className={`${CARD_CLASS} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returns.map(rr => (
                    <tr key={rr._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-gray-600">
                          #{(rr.orderId?._id || rr.orderId)?.toString().slice(-8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{rr.userId?.name || "—"}</p>
                        <p className="text-xs text-gray-400">{rr.userId?.email}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(rr.createdAt)}</td>
                      <td className="px-5 py-3 text-gray-600">{rr.items.length}</td>
                      <td className="px-5 py-3">
                        <Badge kind="return" status={rr.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link to={`/admin/returns/${rr._id}`} className="text-brand-600 hover:underline text-xs font-medium">
                          View
                        </Link>
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
    </div>
  );
}

function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        active ? "bg-gray-900 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
