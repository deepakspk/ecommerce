import { useState, useEffect } from "react";
import * as addressApi from "../api/addresses";
import { getErrorMessage } from "../utils/errorHelpers";
import { AddressForm } from "./AddressForm";

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
