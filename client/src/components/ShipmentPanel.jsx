import { useState, useEffect, useCallback } from "react";
import * as adminApi from "../api/admin";
import { getErrorMessage } from "../utils/errorHelpers";
import { printShippingLabel } from "../utils/shippingLabel";
import Badge from "./Badge";
import { CARD_CLASS } from "../utils/ui";

const DELIVERY_TYPES = [
  { value: "DOOR_TO_DOOR", label: "Door to Door" },
  { value: "BRANCH_TO_DOOR", label: "Branch to Door" },
  { value: "DOOR_TO_BRANCH", label: "Door to Branch" },
  { value: "BRANCH_TO_BRANCH", label: "Branch to Branch" },
];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-NP", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ShipmentPanel({ orderId, order }) {
  const [providers, setProviders] = useState([]);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);

  const [providerCode, setProviderCode] = useState("");
  const [branches, setBranches] = useState([]);
  const [toBranch, setToBranch] = useState("");
  const [packageLabel, setPackageLabel] = useState("");
  const [weight, setWeight] = useState("");
  const [deliveryType, setDeliveryType] = useState("DOOR_TO_DOOR");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [debugParams, setDebugParams] = useState(null);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returning, setReturning] = useState(false);
  const [returnError, setReturnError] = useState("");
  const [printingLabel, setPrintingLabel] = useState(false);
  const [labelError, setLabelError] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.all([
      adminApi.listLogisticsProviders().catch(() => ({ providers: [] })),
      adminApi.getShipment(orderId).catch(() => ({ shipment: null })),
    ]).then(([providersRes, shipmentRes]) => {
      if (ignore) return;
      setProviders(providersRes.providers);
      setShipment(shipmentRes.shipment);
      setLoading(false);
    });
    return () => { ignore = true; };
  }, [orderId]);

  const loadBranches = useCallback((code) => {
    const provider = providers.find((p) => p.code === code);
    if (!provider?.capabilities.branchResolution) {
      setBranches([]);
      return;
    }
    adminApi.getProviderBranches(code).then(({ branches: list }) => {
      setBranches(list);
      const suggested = list.find(
        (b) => b.district?.toUpperCase() === order.address.district?.toUpperCase()
      );
      if (suggested) setToBranch(suggested.name);
    }).catch(() => setBranches([]));
  }, [providers, order.address.district]);

  function handleProviderChange(code) {
    setProviderCode(code);
    setToBranch("");
    loadBranches(code);
  }

  async function handleCreateShipment(e) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const { shipment: created, debugParams: sent } = await adminApi.createShipment(orderId, {
        provider: providerCode,
        toBranch,
        packageLabel: packageLabel || undefined,
        weight: weight || undefined,
        deliveryType,
      });
      setDebugParams(sent || null);
      setShipment(created);
    } catch (e) {
      setCreateError(getErrorMessage(e));
      setDebugParams(e.response?.data?.debugParams || null);
    } finally {
      setCreating(false);
    }
  }

  async function handleRefresh() {
    setRefreshError("");
    setRefreshing(true);
    try {
      const { shipment: updated } = await adminApi.refreshShipmentTracking(shipment._id);
      setShipment(updated);
    } catch (e) {
      setRefreshError(getErrorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }

  async function handlePrintLabel() {
    setLabelError("");
    setPrintingLabel(true);
    try {
      const { label } = await adminApi.getShipmentLabel(shipment._id);
      const opened = await printShippingLabel(label);
      if (!opened) setLabelError("Allow popups to open and print the label.");
    } catch (e) {
      setLabelError(getErrorMessage(e));
    } finally {
      setPrintingLabel(false);
    }
  }

  async function handleReturn() {
    setReturnError("");
    setReturning(true);
    try {
      const { shipment: updated } = await adminApi.markShipmentReturn(shipment._id, returnReason);
      setShipment(updated);
    } catch (e) {
      setReturnError(getErrorMessage(e));
    } finally {
      setReturning(false);
    }
  }

  if (loading) {
    return (
      <div className={`${CARD_CLASS} p-5`}>
        <h2 className="text-sm font-semibold text-gray-800 mb-1">Shipment</h2>
        <p className="text-xs text-gray-400">Loading…</p>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className={`${CARD_CLASS} p-5`}>
        <h2 className="text-sm font-semibold text-gray-800 mb-1">Shipment</h2>
        <p className="text-xs text-gray-400">No logistics providers are configured.</p>
      </div>
    );
  }

  if (!shipment) {
    const provider = providers.find((p) => p.code === providerCode);
    return (
      <div className={`${CARD_CLASS} p-5`}>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Create Shipment</h2>
        <form onSubmit={handleCreateShipment} className="space-y-3">
          <select
            value={providerCode}
            onChange={(e) => handleProviderChange(e.target.value)}
            required
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Select carrier…</option>
            {providers.map((p) => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>

          {provider?.capabilities.branchResolution && (
            <select
              value={toBranch}
              onChange={(e) => setToBranch(e.target.value)}
              required
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select destination branch…</option>
              {branches.map((b) => (
                <option key={b.name} value={b.name}>{b.name} ({b.district})</option>
              ))}
            </select>
          )}

          <select
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            {DELIVERY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Package description (optional)"
            value={packageLabel}
            onChange={(e) => setPackageLabel(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
          />

          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="Weight in kg (optional)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
          />

          {createError && <p className="text-xs text-red-600">{createError}</p>}

          <button
            type="submit"
            disabled={creating || !providerCode || (provider?.capabilities.branchResolution && !toBranch)}
            className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating…" : "Create Shipment"}
          </button>
        </form>

        {debugParams && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-1">
              Debug — params sent to carrier{createError ? " (failed request)" : ""}
            </p>
            <pre className="text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-2 overflow-x-auto text-gray-600 whitespace-pre-wrap break-all">
              {JSON.stringify(debugParams, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  const shipmentProvider = providers.find((p) => p.code === shipment.provider);

  return (
    <div className={`${CARD_CLASS} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-800">Shipment</h2>
        <Badge kind="shipment" status={shipment.status} />
      </div>

      <p className="text-sm text-gray-700">
        {shipmentProvider?.label || shipment.provider} ·{" "}
        <span className="font-mono text-gray-500">{shipment.providerShipmentId}</span>
      </p>

      {shipment.trackingEvents.length > 0 && (
        <ul className="mt-3 space-y-2 border-l border-gray-200 pl-3">
          {shipment.trackingEvents.map((event, i) => (
            <li key={i} className="text-xs">
              <p className="font-medium text-gray-700">{event.rawStatus || event.status}</p>
              <p className="text-gray-400">{fmtDate(event.occurredAt)}</p>
            </li>
          ))}
        </ul>
      )}

      {refreshError && <p className="text-xs text-red-600 mt-2">{refreshError}</p>}

      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="w-full mt-3 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
      >
        {refreshing ? "Refreshing…" : "Refresh tracking"}
      </button>

      {shipmentProvider?.capabilities.labelPrinting && (
        <div className="mt-2">
          {labelError && <p className="text-xs text-red-600 mb-2">{labelError}</p>}
          <button
            onClick={handlePrintLabel}
            disabled={printingLabel}
            className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {printingLabel ? "Preparing…" : "Print Label (4×6 in)"}
          </button>
        </div>
      )}

      {shipmentProvider?.capabilities.returnShipment && shipment.status !== "RETURNED" && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <input
            type="text"
            placeholder="Return reason (optional)"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mb-2"
          />
          {returnError && <p className="text-xs text-red-600 mb-2">{returnError}</p>}
          <button
            onClick={handleReturn}
            disabled={returning}
            className="w-full bg-orange-50 text-orange-600 border border-orange-200 py-2 rounded-lg text-sm font-semibold hover:bg-orange-100 disabled:opacity-50 transition-colors"
          >
            {returning ? "Marking…" : "Mark for return"}
          </button>
        </div>
      )}
    </div>
  );
}
