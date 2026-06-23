import { useState, useEffect } from "react";
import * as addressApi from "../api/addresses";
import { getErrorMessage } from "../utils/errorHelpers";
import NEPAL_GEO, { getDistricts, getMunicipalities } from "../data/nepalGeoData";

const PROVINCES = Object.keys(NEPAL_GEO);

const EMPTY_FORM = {
  label: "", recipientName: "", phone: "",
  province: "", district: "", city: "",
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

function AddressForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [err, setErr] = useState("");

  const districts = form.province ? getDistricts(form.province) : [];
  const municipalities = form.province && form.district
    ? getMunicipalities(form.province, form.district)
    : [];

  function set(field, val) {
    setForm(f => {
      const next = { ...f, [field]: val };
      // Reset downstream fields when a parent changes
      if (field === "province") { next.district = ""; next.city = ""; }
      if (field === "district") { next.city = ""; }
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
        <TextInput label="Label (optional)" value={form.label} onChange={v => set("label", v)} placeholder="e.g. Home, Office" />
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

        <TextInput label="Area / Tole" value={form.area} onChange={v => set("area", v)} placeholder="e.g. Thamel" />
        <TextInput label="Street" value={form.street} onChange={v => set("street", v)} placeholder="Street or road name" />

        <div className="sm:col-span-2">
          <TextInput label="Landmark" value={form.landmark} onChange={v => set("landmark", v)} placeholder="e.g. Near XYZ Hospital" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={e => set("isDefault", e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        Set as default address
      </label>

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

function formatAddress(a) {
  return [a.area, a.street, a.city, a.district, a.province].filter(Boolean).join(", ");
}

export default function AddressBook() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await addressApi.getAddresses();
      setAddresses(data.addresses);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(form) {
    setSaving(true);
    try {
      await addressApi.createAddress(form);
      await load();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id, form) {
    setSaving(true);
    try {
      await addressApi.updateAddress(id, form);
      await load();
      setEditId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this address?")) return;
    setDeletingId(id);
    try {
      await addressApi.deleteAddress(id);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(id) {
    try {
      await addressApi.setDefaultAddress(id);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); }}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700"
          >
            + Add Address
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>
      )}

      {showForm && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">New Address</h2>
          <AddressForm
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-2">No saved addresses yet.</p>
          <button onClick={() => setShowForm(true)} className="text-brand-600 hover:underline text-sm">
            Add your first address →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map(a => (
            <div key={a._id}>
              {editId === a._id ? (
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Edit Address</h2>
                  <AddressForm
                    initial={a}
                    onSave={(form) => handleUpdate(a._id, form)}
                    onCancel={() => setEditId(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <div className={`border rounded-lg p-4 ${a.isDefault ? "border-brand-400 bg-brand-50" : "border-gray-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {a.label && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{a.label}</span>
                        )}
                        {a.isDefault && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">Default</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{a.recipientName}</p>
                      <p className="text-sm text-gray-600">{a.phone}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{formatAddress(a)}</p>
                      {a.landmark && <p className="text-xs text-gray-400 mt-0.5">Near: {a.landmark}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      {!a.isDefault && (
                        <button
                          onClick={() => handleSetDefault(a._id)}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium text-right"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        onClick={() => { setEditId(a._id); setShowForm(false); }}
                        className="text-xs text-gray-500 hover:text-gray-800 font-medium text-right"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(a._id)}
                        disabled={deletingId === a._id}
                        className="text-xs text-red-500 hover:text-red-700 font-medium text-right disabled:opacity-50"
                      >
                        {deletingId === a._id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
