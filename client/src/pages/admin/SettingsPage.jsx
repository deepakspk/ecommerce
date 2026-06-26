import { useState, useEffect } from "react";
import * as settingsApi from "../../api/settings";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { CARD_CLASS, INPUT_CLASS } from "../../utils/ui";

const GROUP_LABELS = {
  SMTP: "SMTP (Email)",
  CLOUDINARY: "Cloudinary",
  KHALTI: "Khalti",
  ESEWA: "eSewa",
  LOGISTICS: "Logistics",
  APPLICATION: "Application",
};

const GROUPS = Object.keys(GROUP_LABELS);

function FieldInput({ field, value, onChange }) {
  if (field.key === "SMTP_ENCRYPTION") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS}>
        <option value="TLS">TLS</option>
        <option value="SSL">SSL</option>
        <option value="NONE">None</option>
      </select>
    );
  }
  return (
    <input
      type={field.isSecret ? "password" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.isSecret ? (field.value ? "•••••••• (saved — leave blank to keep)" : "Not set") : ""}
      className={INPUT_CLASS}
    />
  );
}

function initialFormFor(fields) {
  const initial = {};
  for (const f of fields) initial[f.key] = f.isSecret ? "" : f.value;
  return initial;
}

function GroupForm({ fields, onSave }) {
  const [form, setForm] = useState(() => initialFormFor(fields));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      await onSave(form);
      setSaveSuccess("Settings saved.");
    } catch (e) {
      setSaveError(e.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className={`${CARD_CLASS} p-6 flex-1 space-y-4`}>
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
          <FieldInput field={field} value={form[field.key] ?? ""} onChange={(v) => setField(field.key, v)} />
        </div>
      ))}

      {saveError && <p className="text-red-600 text-sm">{saveError}</p>}
      {saveSuccess && <p className="text-green-600 text-sm">{saveSuccess}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export default function SettingsPage() {
  const [groups, setGroups] = useState(null);
  const [activeGroup, setActiveGroup] = useState("SMTP");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    let active = true;
    settingsApi.getSettings()
      .then((data) => {
        if (!active) return;
        setGroups(data.groups);
        setLoadError("");
      })
      .catch((e) => {
        if (active) setLoadError(e.response?.data?.message || "Failed to load settings");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  async function handleGroupSave(group, values) {
    const data = await settingsApi.updateSettingsGroup(group, values);
    setGroups((prev) => ({ ...prev, [group]: data.group }));
  }

  async function handleExport() {
    try {
      const data = await settingsApi.exportSettings();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "system-settings-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Failed to export settings");
    }
  }

  if (loading) return <div className="p-4 sm:p-8"><p className="text-gray-400 text-sm">Loading…</p></div>;
  if (loadError) return <div className="p-4 sm:p-8"><p className="text-red-600 text-sm">{loadError}</p></div>;

  return (
    <div className="p-4 sm:p-8">
      <AdminPageHeader
        title="System Settings"
        action={
          <button onClick={handleExport} className="bg-white text-brand-700 text-xs font-semibold rounded-md px-3 py-2 hover:bg-brand-50 transition-colors shadow-sm">
            Export (non-secret) JSON
          </button>
        }
      />
      {exportError && <p className="text-red-600 text-sm mb-4">{exportError}</p>}

      <div className="flex flex-col sm:flex-row gap-6">
        <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:w-48 flex-shrink-0">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`text-left px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                activeGroup === g ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {GROUP_LABELS[g]}
            </button>
          ))}
        </nav>

        <GroupForm
          key={activeGroup}
          fields={groups[activeGroup] || []}
          onSave={(values) => handleGroupSave(activeGroup, values)}
        />
      </div>
    </div>
  );
}
