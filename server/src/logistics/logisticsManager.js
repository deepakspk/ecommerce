import ncmProvider from "./providers/ncmProvider.js";

const REQUIRED_METHODS = ["createShipment", "getShipmentStatus", "getTrackingEvents", "normalizeStatus"];

const registry = new Map();

function register(provider) {
  for (const method of REQUIRED_METHODS) {
    if (typeof provider[method] !== "function") {
      throw new Error(`Logistics provider ${provider.code} is missing required method "${method}"`);
    }
  }
  registry.set(provider.code, provider);
}

// Future carriers (Pathao, DHL, ...) are added here — nothing else in the app needs to change.
// Registered unconditionally; isConfigured() is checked per-call (not at import time) so a
// SUPER_ADMIN enabling a carrier's credentials via /admin/settings takes effect without a restart.
[ncmProvider].forEach(register);

export function getProvider(code) {
  const provider = registry.get(code);
  if (!provider || !provider.isConfigured()) {
    const err = new Error(`Unknown or unconfigured logistics provider: ${code}`);
    err.status = 400;
    throw err;
  }
  return provider;
}

export function listProviders() {
  return [...registry.values()]
    .filter((provider) => provider.isConfigured())
    .map(({ code, label, capabilities }) => ({ code, label, capabilities }));
}

// Used by customer-facing flows (address branch selection, checkout delivery rate) that don't
// know or care which specific carrier is active — just "whichever configured one can do this."
export function getDefaultProvider(capability) {
  return (
    [...registry.values()].find(
      (provider) => provider.isConfigured() && (!capability || provider.capabilities[capability])
    ) || null
  );
}

export async function listBranchesForDistrict(district) {
  const provider = getDefaultProvider("branchResolution");
  if (!provider || !district) return [];
  const branches = await provider.listBranches();
  return branches.filter((b) => b.district_name?.toUpperCase() === district.toUpperCase());
}
