import { useState, useEffect } from "react";
import * as logisticsApi from "../api/logistics";
import { getErrorMessage } from "../utils/errorHelpers";
import NEPAL_GEO, { getDistricts, getMunicipalities } from "../data/nepalGeoData";

const PROVINCES = Object.keys(NEPAL_GEO);

const EMPTY_ADDRESS_FORM = {
  label: "", recipientName: "", phone: "",
  province: "", district: "", city: "", branchName: "",
  area: "", street: "", landmark: "",
  isDefault: false,
};

function Select({ label, required, value, onChange, options, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && " *"}
      </label>
      <select
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextInput({ label, required, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && " *"}
      </label>
      <input
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}

export function AddressForm({ initial = EMPTY_ADDRESS_FORM, onSave, onCancel, saving, showLabelAndDefault = true }) {
  const [form, setForm] = useState({ ...EMPTY_ADDRESS_FORM, ...initial });
  const [err, setErr] = useState("");
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const districts = form.province ? getDistricts(form.province) : [];
  const municipalities = form.province && form.district
    ? getMunicipalities(form.province, form.district)
    : [];

  // The branch field only matters where our courier partner actually has a branch — most
  // districts have none, in which case the field simply doesn't appear (it's optional).
  useEffect(() => {
    if (!form.district) { setBranches([]); return; }
    let ignore = false;
    setLoadingBranches(true);
    logisticsApi.getDistrictBranches(form.district)
      .then(({ branches: list }) => { if (!ignore) setBranches(list); })
      .catch(() => { if (!ignore) setBranches([]); })
      .finally(() => { if (!ignore) setLoadingBranches(false); });
    return () => { ignore = true; };
  }, [form.district]);

  function set(field, val) {
    setForm(f => {
      const next = { ...f, [field]: val };
      // Reset downstream fields when a parent changes
      if (field === "province") { next.district = ""; next.city = ""; next.branchName = ""; }
      if (field === "district") { next.city = ""; next.branchName = ""; }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await onSave(form);
    } catch (e) {
      setErr(e.response ? getErrorMessage(e) : e.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
      {err && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {showLabelAndDefault && (
          <TextInput label="Label (optional)" value={form.label} onChange={v => set("label", v)} placeholder="e.g. Home, Office" />
        )}
        <TextInput label="Recipient Name" required value={form.recipientName} onChange={v => set("recipientName", v)} />
        <TextInput label="Phone" required value={form.phone} onChange={v => set("phone", v)} placeholder="98XXXXXXXX" />

        <Select
          label="Province"
          required
          value={form.province}
          onChange={v => set("province", v)}
          options={PROVINCES}
          placeholder="Select province"
        />

        <Select
          label="District"
          required
          value={form.district}
          onChange={v => set("district", v)}
          options={districts}
          placeholder={form.province ? "Select district" : "Select province first"}
          disabled={!form.province}
        />

        <Select
          label="City / Municipality"
          required
          value={form.city}
          onChange={v => set("city", v)}
          options={municipalities}
          placeholder={form.district ? "Select municipality" : "Select district first"}
          disabled={!form.district}
        />

        {loadingBranches && (
          <p className="text-xs text-gray-400 sm:col-span-2">Checking for a courier branch in this district…</p>
        )}
        {!loadingBranches && branches.length > 0 && (
          <Select
            label="Delivery Branch"
            required
            value={form.branchName}
            onChange={v => set("branchName", v)}
            options={branches.map(b => b.name)}
            placeholder="Select delivery branch"
          />
        )}

        <TextInput label="Area / Tole" value={form.area} onChange={v => set("area", v)} placeholder="e.g. Thamel" />
        <TextInput label="Street" value={form.street} onChange={v => set("street", v)} placeholder="Street or road name" />

        <div className="sm:col-span-2">
          <TextInput label="Landmark" value={form.landmark} onChange={v => set("landmark", v)} placeholder="e.g. Near XYZ Hospital" />
        </div>
      </div>

      {showLabelAndDefault && (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={e => set("isDefault", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Set as default address
        </label>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Address"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
