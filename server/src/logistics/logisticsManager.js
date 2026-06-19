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
[ncmProvider].filter((provider) => provider.isConfigured()).forEach(register);

export function getProvider(code) {
  const provider = registry.get(code);
  if (!provider) {
    const err = new Error(`Unknown or unconfigured logistics provider: ${code}`);
    err.status = 400;
    throw err;
  }
  return provider;
}

export function listProviders() {
  return [...registry.values()].map(({ code, label, capabilities }) => ({ code, label, capabilities }));
}
