import { useState, useEffect, useMemo } from "react";
import * as adminApi from "../../api/admin";
import EmptyState from "../../components/EmptyState";
import { downloadBlob } from "../../utils/downloadBlob";
import { H1_CLASS, CARD_CLASS, INPUT_CLASS, BUTTON_SECONDARY, SECTION_HEADING_CLASS } from "../../utils/ui";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

function toDateInput(d) {
  return d.toISOString().slice(0, 10);
}

function rangeForPreset(preset) {
  const today = new Date();
  if (preset === "today") return { from: toDateInput(today), to: toDateInput(today) };
  const days = preset === "7d" ? 6 : 29;
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { from: toDateInput(from), to: toDateInput(today) };
}

function fmtMoney(n) {
  return `Rs ${Number(n || 0).toLocaleString("en-NP", { maximumFractionDigits: 2 })}`;
}

function SalesChart({ data }) {
  if (!data.length) return <p className="text-sm text-gray-400 py-10 text-center">No sales in this range.</p>;
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-1 h-48 px-1">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full bg-brand-500 rounded-t hover:bg-brand-600 transition-colors"
            style={{ height: `${Math.max(4, (d.total / max) * 160)}px` }}
            title={`${d.date}: ${fmtMoney(d.total)} (${d.orders} orders)`}
          />
          <span className="text-[10px] text-gray-400 rotate-0 whitespace-nowrap">
            {d.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProductTable({ title, rows, metric }) {
  return (
    <div className={`${CARD_CLASS} overflow-hidden`}>
      <div className="px-5 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
              <th className="text-right px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{metric}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.productName}>
                <td className="px-5 py-2 text-gray-700">{r.productName}</td>
                <td className="px-5 py-2 text-right font-medium text-gray-900">
                  {metric === "Revenue" ? fmtMoney(r.revenue) : r.units}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [preset, setPreset] = useState("7d");
  const [customFrom, setCustomFrom] = useState(rangeForPreset("7d").from);
  const [customTo, setCustomTo] = useState(rangeForPreset("7d").to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const { from, to } = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return rangeForPreset(preset);
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await adminApi.getReportSummary({ from, to });
        if (!active) return;
        setData(result);
        setError("");
      } catch (e) {
        if (active) setError(e.response?.data?.message || "Failed to load report");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [from, to]);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await adminApi.exportOrdersCsv({ from, to });
      downloadBlob(blob, `orders-${from}-to-${to}.csv`);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className={H1_CLASS}>Reports</h1>
        <button onClick={handleExport} disabled={exporting} className={BUTTON_SECONDARY}>
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          className={`${INPUT_CLASS} w-auto`}
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {preset === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className={`${INPUT_CLASS} w-auto`}
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className={`${INPUT_CLASS} w-auto`}
            />
          </>
        )}
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : !data ? (
        <EmptyState title="No report data available." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className={`${CARD_CLASS} p-4`}>
              <p className="text-xs text-gray-500 mb-1">Total Sales</p>
              <p className="text-xl font-bold text-gray-900">{fmtMoney(data.summary.totalSales)}</p>
            </div>
            <div className={`${CARD_CLASS} p-4`}>
              <p className="text-xs text-gray-500 mb-1">Total Orders</p>
              <p className="text-xl font-bold text-gray-900">{data.summary.totalOrders}</p>
            </div>
            <div className={`${CARD_CLASS} p-4`}>
              <p className="text-xs text-gray-500 mb-1">New Customers</p>
              <p className="text-xl font-bold text-gray-900">{data.summary.newCustomers}</p>
            </div>
            <div className={`${CARD_CLASS} p-4`}>
              <p className="text-xs text-gray-500 mb-1">Avg Order Value</p>
              <p className="text-xl font-bold text-gray-900">{fmtMoney(data.summary.avgOrderValue)}</p>
            </div>
          </div>

          <div className={`${CARD_CLASS} p-5`}>
            <h2 className={`${SECTION_HEADING_CLASS} mb-4`}>Sales over time</h2>
            <SalesChart data={data.salesOverTime} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <ProductTable title="Top products by revenue" rows={data.topProductsByRevenue} metric="Revenue" />
            <ProductTable title="Top products by units sold" rows={data.topProductsByUnits} metric="Units" />
          </div>
        </div>
      )}
    </div>
  );
}
