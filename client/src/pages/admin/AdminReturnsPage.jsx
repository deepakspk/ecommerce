import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as adminApi from "../../api/admin";

const ALL_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "PICKED_UP", "REFUNDED"];

const STATUS_COLORS = {
  REQUESTED: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-600",
  PICKED_UP: "bg-indigo-100 text-indigo-700",
  REFUNDED: "bg-green-100 text-green-700",
};

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

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = { page, limit: 25 };
        if (statusFilter) params.status = statusFilter;
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
  }, [statusFilter, page]);

  function setFilter(status) {
    if (status) setSearchParams({ status });
    else setSearchParams({});
    setPage(1);
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Returns</h1>
          {!loading && <p className="text-sm text-gray-400 mt-0.5">{total} request{total !== 1 ? "s" : ""}</p>}
        </div>
      </div>

      <div className="flex gap-1 mb-5 flex-wrap">
        <FilterTab label="All" active={!statusFilter} onClick={() => setFilter("")} />
        {ALL_STATUSES.map(s => (
          <FilterTab key={s} label={s.replace("_", " ")} active={statusFilter === s} onClick={() => setFilter(s)} />
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : returns.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          No return requests{statusFilter ? ` with status "${statusFilter}"` : ""}.
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[rr.status]}`}>
                          {rr.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link to={`/admin/returns/${rr._id}`} className="text-blue-600 hover:underline text-xs font-medium">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-5">
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    p === page ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
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
