import { useState, useEffect } from "react";
import * as adminApi from "../../api/admin";
import { getErrorMessage } from "../../utils/errorHelpers";
import { INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY, BUTTON_SECONDARY } from "../../utils/ui";

const DELIVERY_TYPES = [
  { value: "DOOR_TO_DOOR", label: "Door to Door" },
  { value: "BRANCH_TO_DOOR", label: "Branch to Door" },
  { value: "DOOR_TO_BRANCH", label: "Door to Branch" },
  { value: "BRANCH_TO_BRANCH", label: "Branch to Branch" },
];

function TruckIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 0h-12" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CreateShipmentModal({ order, provider, onClose, onCreated }) {
  const [deliveryType, setDeliveryType] = useState("DOOR_TO_DOOR");
  const [weight, setWeight] = useState("");
  const [description, setDescription] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [branches, setBranches] = useState([]);
  const [resolvingBranch, setResolvingBranch] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const district = order.address.district;
  const districtMatches = branches.filter((b) => b.district_name?.toUpperCase() === district?.toUpperCase());
  const otherBranches = branches.filter((b) => !districtMatches.includes(b));
  const selectedBranch = branches.find((b) => b.name === toBranch);
  const branchFromAddress = Boolean(order.address.branchName) && branches.some((b) => b.name === order.address.branchName);

  // The customer's saved address already pins down the exact branch (chosen at checkout
  // time) — use it directly when present. Only fall back to district-guessing for older
  // orders or districts where NCM had no coverage when the address was saved. Multiple NCM
  // branches can share a district (e.g. Kathmandu has both TINKUNE and SANKHU), so even the
  // fallback only pre-fills when there's exactly one match, leaving the rest for the admin.
  useEffect(() => {
    let ignore = false;
    if (!provider.capabilities.branchResolution) {
      setResolvingBranch(false);
      return;
    }
    adminApi.getProviderBranches(provider.code)
      .then(({ branches: list }) => {
        if (ignore) return;
        setBranches(list);
        if (order.address.branchName && list.some((b) => b.name === order.address.branchName)) {
          setToBranch(order.address.branchName);
        } else {
          const matches = list.filter((b) => b.district_name?.toUpperCase() === district?.toUpperCase());
          if (matches.length === 1) setToBranch(matches[0].name);
        }
        if (list.length === 0) setLoadError(`${provider.label} returned no destination branches.`);
      })
      .catch(() => { if (!ignore) setLoadError(`Couldn't load destination branches for ${provider.label}.`); })
      .finally(() => { if (!ignore) setResolvingBranch(false); });
    return () => { ignore = true; };
  }, [provider, district, order.address.branchName]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      const { shipment } = await adminApi.createShipment(order._id, {
        provider: provider.code,
        toBranch,
        deliveryType,
        weight: weight || undefined,
        instruction: description || undefined,
      });
      onCreated(shipment);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !resolvingBranch && !!toBranch && !submitting;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-brand-600 to-brand-800 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <CloseIcon />
          </button>
          <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center mb-3">
            <TruckIcon className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold">Create Shipment</h2>
          <p className="text-sm text-white/80 mt-0.5">
            via {provider.label} · Order #{String(order._id).slice(-8).toUpperCase()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Delivery Address</p>
            <p className="text-sm font-medium text-gray-900">{order.address.recipientName}</p>
            <p className="text-sm text-gray-600">{order.address.phone}</p>
            <p className="text-sm text-gray-600">
              {[order.address.area, order.address.street, order.address.city, order.address.district, order.address.province]
                .filter(Boolean)
                .join(", ")}
            </p>
            {order.address.landmark && (
              <p className="text-xs text-gray-400 mt-0.5">Near: {order.address.landmark}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>Delivery Type</label>
            <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} className={INPUT_CLASS}>
              {DELIVERY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>
              Weight (kg) <span className="text-gray-400 font-normal">— optional</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 1.5"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>
              Description <span className="text-gray-400 font-normal">— optional</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Note for the courier…"
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          {resolvingBranch && <p className="text-xs text-gray-400">Resolving destination branch…</p>}
          {loadError && <p className="text-xs text-red-600">{loadError}</p>}

          {!resolvingBranch && !loadError && branches.length > 0 && (
            <div>
              <label className={LABEL_CLASS}>Destination Branch</label>
              {branchFromAddress && (
                <p className="text-xs text-gray-500 mb-1">Pre-filled from the customer's saved delivery branch.</p>
              )}
              {!branchFromAddress && districtMatches.length > 1 && (
                <p className="text-xs text-gray-500 mb-1">
                  {districtMatches.length} {provider.label} branches found in {district} — please confirm the right one.
                </p>
              )}
              {!branchFromAddress && districtMatches.length === 0 && (
                <p className="text-xs text-gray-500 mb-1">
                  No {provider.label} branch found for "{district}" — please choose manually.
                </p>
              )}
              <select
                value={toBranch}
                onChange={(e) => setToBranch(e.target.value)}
                required
                className={INPUT_CLASS}
              >
                <option value="">Select branch…</option>
                {districtMatches.length > 0 && (
                  <optgroup label={`Branches in ${district}`}>
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

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{submitError}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className={`${BUTTON_SECONDARY} flex-1`}>
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit} className={`${BUTTON_PRIMARY} flex-1`}>
              {submitting ? "Creating…" : "Create Shipment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ShipmentQuickCreate({ order, providers, onCreated }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalProvider, setModalProvider] = useState(null);

  if (providers.length === 0) return <span className="text-xs text-gray-400">—</span>;

  const defaultProvider = providers[0];
  const hasMultipleProviders = providers.length > 1;

  return (
    <>
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={() => setModalProvider(defaultProvider)}
          className="flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-l-md hover:bg-brand-700 transition-colors"
        >
          <TruckIcon />
          {defaultProvider.label}
        </button>
        {hasMultipleProviders && (
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Choose a different logistics partner"
            className="px-1.5 bg-brand-700 text-white rounded-r-md hover:bg-brand-800 transition-colors border-l border-brand-500/50"
          >
            <ChevronDownIcon />
          </button>
        )}

        {menuOpen && hasMultipleProviders && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[170px] z-20">
            {providers.map((p) => (
              <button
                key={p.code}
                type="button"
                onClick={() => { setModalProvider(p); setMenuOpen(false); }}
                className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {modalProvider && (
        <CreateShipmentModal
          order={order}
          provider={modalProvider}
          onClose={() => setModalProvider(null)}
          onCreated={(shipment) => {
            setModalProvider(null);
            onCreated(order._id, shipment);
          }}
        />
      )}
    </>
  );
}
