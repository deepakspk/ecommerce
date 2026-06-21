import { useState, useEffect } from "react";
import * as adminApi from "../../api/admin";
import { deriveBrandScale, getContrastColor } from "../../utils/colorShades";
import { H1_CLASS, CARD_CLASS, INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY } from "../../utils/ui";

const FIELDS = [
  { key: "primaryColor", label: "Primary Color", live: true },
  { key: "secondaryColor", label: "Secondary Color", live: true },
  { key: "accentColor", label: "Accent Color", live: false },
  { key: "buttonColor", label: "Button Color", live: false },
  { key: "textColor", label: "Text Color", live: false },
  { key: "backgroundColor", label: "Background Color", live: false },
];

function ColorField({ field, value, onChange }) {
  return (
    <div>
      <label className={LABEL_CLASS}>
        {field.label}
        {!field.live && <span className="text-gray-400 font-normal"> (saved, not yet applied to the storefront)</span>}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}

export default function ThemeSettingsPage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const { theme } = await adminApi.getThemeSettingsAdmin();
        if (!ignore) {
          setForm({
            primaryColor: theme.primaryColor || "#2563eb",
            secondaryColor: theme.secondaryColor || "#1e293b",
            accentColor: theme.accentColor || "#f59e0b",
            buttonColor: theme.buttonColor || "#2563eb",
            textColor: theme.textColor || "#111827",
            backgroundColor: theme.backgroundColor || "#ffffff",
          });
        }
      } catch (e) {
        if (!ignore) setLoadError(e.response?.data?.message || "Failed to load theme settings");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      await adminApi.updateThemeSettings(form);
      setSaveSuccess("Theme settings saved. Reload the storefront to see the new colors.");
    } catch (e) {
      setSaveError(e.response?.data?.message || "Failed to save theme settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 sm:p-8"><p className="text-gray-400 text-sm">Loading…</p></div>;
  if (loadError) return <div className="p-4 sm:p-8"><p className="text-red-600 text-sm">{loadError}</p></div>;

  const scale = deriveBrandScale(form.primaryColor);

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <h1 className={`${H1_CLASS} mb-2`}>Theme Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Primary Color drives buttons, links, and badges. Secondary Color drives the Navbar
        and Footer background. The other fields are saved for future use.
      </p>

      <form onSubmit={handleSave} className={`${CARD_CLASS} p-6 space-y-5`}>
        {FIELDS.map((field) => (
          <ColorField
            key={field.key}
            field={field}
            value={form[field.key]}
            onChange={(v) => setField(field.key, v)}
          />
        ))}

        <div>
          <p className={LABEL_CLASS}>Navbar / Footer preview</p>
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: form.secondaryColor, color: getContrastColor(form.secondaryColor) }}
            >
              <span className="font-semibold text-sm">Your Store</span>
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: form.primaryColor }}
              >
                2
              </span>
            </div>
            <div
              className="px-4 py-2.5 text-xs flex items-center justify-between"
              style={{ backgroundColor: form.secondaryColor, color: getContrastColor(form.secondaryColor) }}
            >
              <span className="opacity-70">© Your Store</span>
              <span style={{ color: form.primaryColor }} className="font-medium">Shop Now</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            How Secondary Color (background) and Primary Color (accents) look together — pick colors with enough contrast and visual harmony before saving.
          </p>
        </div>

        {scale && (
          <div>
            <p className={LABEL_CLASS}>Derived brand scale preview</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {Object.entries(scale).map(([shade, hex]) => (
                <div key={shade} className="flex-1 h-12 flex items-end justify-center pb-1" style={{ backgroundColor: hex }}>
                  <span className="text-[10px] font-mono text-white drop-shadow">{shade}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {saveError && <p className="text-red-600 text-sm">{saveError}</p>}
        {saveSuccess && <p className="text-green-600 text-sm">{saveSuccess}</p>}

        <button type="submit" disabled={saving} className={BUTTON_PRIMARY}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
