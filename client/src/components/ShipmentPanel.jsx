import { useState, useEffect, useCallback, useRef } from "react";
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

export default function ShipmentPanel({ orderId, order, onShipmentChange }) {
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

  const [returnReason, setReturnReason] = useState("");
  const [returning, setReturning] = useState(false);
  const [returnError, setReturnError] = useState("");
  const [printingLabel, setPrintingLabel] = useState(false);
  const [labelError, setLabelError] = useState("");
  const shipmentIdRef = useRef(null);

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

  useEffect(() => {
    shipmentIdRef.current = shipment?._id || null;
  }, [shipment]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!shipmentIdRef.current || returning) return;
      adminApi.getShipment(orderId)
        .then(({ shipment: s }) => { if (s) setShipment(s); })
        .catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [orderId, returning]);

  const loadBranches = useCallback((code) => {
    const provider = providers.find((p) => p.code === code);
    if (!provider?.capabilities.branchResolution) {
      setBranches([]);
      return;
    }
    adminApi.getProviderBranches(code).then(({ branches: list }) => {
      setBranches(list);
      // The customer's saved address already pins down the exact branch chosen at checkout
      // time — use it directly when present. Otherwise fall back to district-guessing, and
      // only pre-fill there when exactly one branch covers the district (multiple NCM
      // branches can share one, e.g. Kathmandu has both TINKUNE and SANKHU).
      if (order.address.branchName && list.some((b) => b.name === order.address.branchName)) {
        setToBranch(order.address.branchName);
        return;
      }
      const matches = list.filter(
        (b) => b.district_name?.toUpperCase() === order.address.district?.toUpperCase()
      );
      if (matches.length === 1) setToBranch(matches[0].name);
    }).catch(() => setBranches([]));
  }, [providers, order.address.district, order.address.branchName]);

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
      onShipmentChange?.(created);
    } catch (e) {
      setCreateError(getErrorMessage(e));
      setDebugParams(e.response?.data?.debugParams || null);
    } finally {
      setCreating(false);
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
      onShipmentChange?.(updated);
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
    const districtMatches = branches.filter(
      (b) => b.district_name?.toUpperCase() === order.address.district?.toUpperCase()
    );
    const otherBranches = branches.filter((b) => !districtMatches.includes(b));
    const selectedBranch = branches.find((b) => b.name === toBranch);
    const branchFromAddress = Boolean(order.address.branchName) && branches.some((b) => b.name === order.address.branchName);
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
            <div>
              {branchFromAddress && (
                <p className="text-xs text-gray-500 mb-1">Pre-filled from the customer's saved delivery branch.</p>
              )}
              <select
                value={toBranch}
                onChange={(e) => setToBranch(e.target.value)}
                required
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select destination branch…</option>
                {districtMatches.length > 0 && (
                  <optgroup label={`Branches in ${order.address.district}`}>
                    {districtMatches.map((b) => (
                      <option key={b.name} value={b.name}>{b.name} ({b.district_name})</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={districtMatches.length > 0 ? "All other branches" : "All branches"}>
                  {otherBranches.map((b) => (
                    <option key={b.name} value={b.name}>{b.name} ({b.district_name})</option>
                  ))}
                </optgroup>
              </select>
              {selectedBranch?.areas_covered && (
                <p className="text-xs text-gray-400 mt-1">Covers: {selectedBranch.areas_covered}</p>
              )}
            </div>
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
      <p className="text-xs text-gray-400 mt-1">
        Full tracking history and live status are in the shipment section below.
      </p>

      {shipmentProvider?.capabilities.labelPrinting && (
        <div className="mt-3">
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
