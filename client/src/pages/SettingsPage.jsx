import { useState, useRef } from "react";
import * as authApi from "../api/auth";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../utils/errorHelpers";
import { FormError } from "../components/FormError";
import Avatar from "../components/Avatar";
import AddressBook from "../components/AddressBook";
import {
  H1_CLASS, SECTION_HEADING_CLASS, CARD_CLASS, INPUT_CLASS, LABEL_CLASS,
  BUTTON_PRIMARY, BUTTON_SECONDARY,
} from "../utils/ui";

function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 mb-4">
      {message}
    </div>
  );
}

function ProfileSection() {
  const { user, refreshMe } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || "");
  const fileInputRef = useRef();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!user) return null;

  function handleAvatarChange(e) {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);
    if (file) setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      if (avatarFile) fd.append("avatar", avatarFile);
      await authApi.updateProfile(fd);
      await refreshMe();
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess("Profile updated successfully.");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${CARD_CLASS} p-5`}>
      <h2 className={`${SECTION_HEADING_CLASS} mb-4`}>Profile</h2>
      <FormError message={error} />
      <SuccessBanner message={success} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar user={{ ...user, avatarUrl: avatarPreview }} size="lg" />
          <div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className={BUTTON_SECONDARY}>
              Change photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS}>Name</label>
          <input
            className={INPUT_CLASS}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Email</label>
          <input
            type="email"
            className={INPUT_CLASS}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Phone</label>
          <input
            className={INPUT_CLASS}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="98XXXXXXXX"
          />
        </div>

        <button type="submit" disabled={saving} className={BUTTON_PRIMARY}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

function PasswordSection() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccess("Password updated successfully.");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${CARD_CLASS} p-5`}>
      <h2 className={`${SECTION_HEADING_CLASS} mb-4`}>Change Password</h2>
      <FormError message={error} />
      <SuccessBanner message={success} />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div>
          <label className={LABEL_CLASS}>Current password</label>
          <input
            type="password"
            className={INPUT_CLASS}
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>New password</label>
          <input
            type="password"
            className={INPUT_CLASS}
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
            required
            minLength={8}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Confirm new password</label>
          <input
            type="password"
            className={INPUT_CLASS}
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            required
            minLength={8}
          />
        </div>

        <button type="submit" disabled={saving} className={BUTTON_PRIMARY}>
          {saving ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className={H1_CLASS}>Settings</h1>

      <ProfileSection />

      <div className={`${CARD_CLASS} p-5`}>
        <h2 className={`${SECTION_HEADING_CLASS} mb-4`}>Delivery Locations</h2>
        <AddressBook />
      </div>

      <PasswordSection />
    </div>
  );
}
