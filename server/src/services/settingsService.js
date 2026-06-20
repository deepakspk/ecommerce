import SystemSetting from "../models/SystemSetting.js";
import { SETTINGS_SCHEMA, SETTINGS_GROUPS, findKeyDef } from "../config/settingsSchema.js";
import { encrypt, decrypt } from "../utils/encryption.js";

const cache = new Map();

function resolveDefault(def) {
  if (def.envFallback && process.env[def.envFallback]) return process.env[def.envFallback];
  return def.default || "";
}

export async function load() {
  const docs = await SystemSetting.find();
  const byKey = new Map(docs.map((doc) => [doc.key, doc]));

  for (const group of SETTINGS_GROUPS) {
    for (const def of SETTINGS_SCHEMA[group]) {
      const doc = byKey.get(def.key);
      if (doc) {
        cache.set(def.key, def.isSecret ? decrypt(doc.value) : doc.value);
      } else {
        cache.set(def.key, resolveDefault(def));
      }
    }
  }
}

export function get(key) {
  if (cache.has(key)) return cache.get(key);
  const def = findKeyDef(key);
  return def ? resolveDefault(def) : "";
}

export function getGroup(group) {
  const defs = SETTINGS_SCHEMA[group] || [];
  const result = {};
  for (const def of defs) {
    result[def.key] = cache.has(def.key) ? cache.get(def.key) : resolveDefault(def);
  }
  return result;
}

export function listGroupsForDisplay() {
  const result = {};
  for (const group of SETTINGS_GROUPS) {
    result[group] = SETTINGS_SCHEMA[group].map((def) => ({
      key: def.key,
      label: def.label,
      isSecret: def.isSecret,
      value: def.isSecret
        ? (cache.get(def.key) ? "••••••••" : "")
        : (cache.has(def.key) ? cache.get(def.key) : resolveDefault(def)),
    }));
  }
  return result;
}

export async function setGroup(group, values) {
  const defs = SETTINGS_SCHEMA[group];
  if (!defs) {
    const err = new Error(`Unknown settings group: ${group}`);
    err.status = 400;
    throw err;
  }

  const errors = [];
  const toApply = [];

  for (const def of defs) {
    if (!(def.key in values)) continue;
    const raw = values[def.key];

    if (def.isSecret && (raw === undefined || raw === null || raw === "")) {
      continue;
    }

    const error = def.validate(raw);
    if (error) {
      errors.push(`${def.label}: ${error}`);
      continue;
    }

    toApply.push({ def, value: String(raw ?? "").trim() });
  }

  if (errors.length > 0) {
    const err = new Error(errors.join("; "));
    err.status = 400;
    throw err;
  }

  for (const { def, value } of toApply) {
    const stored = def.isSecret ? encrypt(value) : value;
    await SystemSetting.findOneAndUpdate(
      { key: def.key },
      { key: def.key, value: stored, group, isSecret: def.isSecret, description: def.label },
      { upsert: true }
    );
    cache.set(def.key, value);
  }

  return toApply.map(({ def }) => def.key);
}
