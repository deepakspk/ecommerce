import { useState } from "react";
import * as contactApi from "../api/contact";
import { getErrorMessage } from "../utils/errorHelpers";
import { useAuth } from "../hooks/useAuth";
import { FormError } from "./FormError";
import { INPUT_CLASS, LABEL_CLASS, BUTTON_PRIMARY, BUTTON_SECONDARY } from "../utils/ui";

// The dialog is mounted fresh on every open so its state (prefill, sent,
// errors) resets without effect-based syncing.
export default function ContactSupportModal({ open, onClose }) {
  if (!open) return null;
  return <ContactSupportDialog onClose={onClose} />;
}

function ContactSupportDialog({ onClose }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    message: "",
  }));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await contactApi.submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => !sending && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Contact support"
      >
        {sent ? (
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-gray-100">Message sent!</h3>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Thanks for reaching out. Our support team will get back to you at{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">{form.email}</span> soon.
            </p>
            <button type="button" onClick={onClose} className={`mt-5 ${BUTTON_PRIMARY}`}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Contact Support</h3>
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Send us any query, feedback, or message — we'll reply by email.
            </p>

            <FormError message={error} />

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={LABEL_CLASS}>Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Your name (optional)"
                  maxLength={120}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="you@example.com"
                    required
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="98XXXXXXXX (optional)"
                    maxLength={20}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLASS}>
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setField("message", e.target.value)}
                  placeholder="How can we help you?"
                  required
                  rows={5}
                  maxLength={5000}
                  className={`${INPUT_CLASS} resize-y min-h-[100px]`}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={sending} className={`flex-1 ${BUTTON_PRIMARY}`}>
                  {sending ? "Sending…" : "Send Message"}
                </button>
                <button type="button" onClick={onClose} disabled={sending} className={BUTTON_SECONDARY}>
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
