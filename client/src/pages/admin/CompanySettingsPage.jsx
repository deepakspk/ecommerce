import { useState, useEffect, useRef } from "react";
import * as adminApi from "../../api/admin";
import { H1_CLASS, CARD_CLASS, INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY } from "../../utils/ui";

const TEXT_FIELDS = [
  { key: "companyName", label: "Company Name" },
  { key: "regdNo", label: "Registration Number" },
  { key: "vatPan", label: "VAT / PAN Number" },
  { key: "phone", label: "Phone Number" },
  { key: "email", label: "Email Address" },
];

const SOCIAL_FIELDS = [
  { key: "facebook", label: "Facebook URL" },
  { key: "instagram", label: "Instagram URL" },
  { key: "tiktok", label: "TikTok URL" },
  { key: "linkedin", label: "LinkedIn URL" },
  { key: "twitter", label: "X (Twitter) URL" },
  { key: "youtube", label: "YouTube URL" },
  { key: "whatsapp", label: "WhatsApp Number" },
];

export default function CompanySettingsPage() {
  const [form, setForm] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [faviconPreview, setFaviconPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const logoInputRef = useRef();
  const faviconInputRef = useRef();

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const { company } = await adminApi.getCompanySettingsAdmin();
        if (ignore) return;
        setForm({
          companyName: company.companyName || "",
          regdNo: company.regdNo || "",
          vatPan: company.vatPan || "",
          address: company.address || "",
          phone: company.phone || "",
          email: company.email || "",
          description: company.description || "",
          ...Object.fromEntries(SOCIAL_FIELDS.map((f) => [f.key, company.social?.[f.key] || ""])),
        });
        setLogoPreview(company.logoUrl || "");
        setFaviconPreview(company.faviconUrl || "");
      } catch (e) {
        if (!ignore) setLoadError(e.response?.data?.message || "Failed to load company settings");
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

  function handleLogoChange(e) {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
  }

  function handleFaviconChange(e) {
    const file = e.target.files?.[0] || null;
    setFaviconFile(file);
    if (file) setFaviconPreview(URL.createObjectURL(file));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const fd = new FormData();
      for (const key of Object.keys(form)) fd.append(key, form[key]);
      if (logoFile) fd.append("logo", logoFile);
      if (faviconFile) fd.append("favicon", faviconFile);

      const { company } = await adminApi.updateCompanySettings(fd);
      setLogoPreview(company.logoUrl || "");
      setFaviconPreview(company.faviconUrl || "");
      setLogoFile(null);
      setFaviconFile(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      if (faviconInputRef.current) faviconInputRef.current.value = "";
      setSaveSuccess("Company settings saved.");
    } catch (e) {
      setSaveError(e.response?.data?.message || "Failed to save company settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 sm:p-8"><p className="text-gray-400 text-sm">Loading…</p></div>;
  if (loadError) return <div className="p-4 sm:p-8"><p className="text-red-600 text-sm">{loadError}</p></div>;

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <h1 className={`${H1_CLASS} mb-6`}>Company Settings</h1>

      <form onSubmit={handleSave} className={`${CARD_CLASS} p-6 space-y-6`}>
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Company Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEXT_FIELDS.map((f) => (
              <div key={f.key}>
                <label className={LABEL_CLASS}>{f.label}</label>
                <input
                  type="text"
                  value={form[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className={LABEL_CLASS}>Company Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div className="mt-4">
            <label className={LABEL_CLASS}>Company Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Branding</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Logo</label>
              {logoPreview && <img src={logoPreview} alt="Logo preview" className="h-12 mb-2 object-contain" />}
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Favicon</label>
              {faviconPreview && <img src={faviconPreview} alt="Favicon preview" className="h-8 mb-2 object-contain" />}
              <input ref={faviconInputRef} type="file" accept="image/*" onChange={handleFaviconChange} className={INPUT_CLASS} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Social Media Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SOCIAL_FIELDS.map((f) => (
              <div key={f.key}>
                <label className={LABEL_CLASS}>{f.label}</label>
                <input
                  type="text"
                  value={form[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            ))}
          </div>
        </div>

        {saveError && <p className="text-red-600 text-sm">{saveError}</p>}
        {saveSuccess && <p className="text-green-600 text-sm">{saveSuccess}</p>}

        <button type="submit" disabled={saving} className={BUTTON_PRIMARY}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
