import { useState, useEffect } from "react";
import * as adminApi from "../../api/admin";
import Badge from "../../components/Badge";
import Pagination from "../../components/Pagination";
import EmptyState from "../../components/EmptyState";
import ClearFiltersButton from "../../components/admin/ClearFiltersButton";
import TableSkeleton from "../../components/admin/TableSkeleton";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { useAuth } from "../../hooks/useAuth";
import { CARD_CLASS, INPUT_CLASS, FILTER_BAR_CLASS, FILTER_FIELD_CLASS } from "../../utils/ui";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NP", { day: "2-digit", month: "short", year: "numeric" });
}

function EyeToggleButton({ visible, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
    >
      {visible ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      )}
    </button>
  );
}

const EMPTY_CREATE_FORM = { name: "", email: "", phone: "", password: "", confirmPassword: "", role: "CUSTOMER", status: "ACTIVE" };

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");

  const [confirmAction, setConfirmAction] = useState(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = { page, limit: 10 };
        if (search.trim()) params.search = search.trim();
        if (roleFilter) params.role = roleFilter;
        if (statusFilter) params.status = statusFilter;
        if (joinedFrom) params.from = joinedFrom;
        if (joinedTo) params.to = joinedTo;
        const data = await adminApi.listUsers(params);
        if (!active) return;
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
        setError("");
      } catch (e) {
        if (active) setError(e.response?.data?.message || "Failed to load users");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, search, roleFilter, statusFilter, joinedFrom, joinedTo]);

  function openCreate() {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError("");
    setShowCreatePassword(false);
    setShowCreate(true);
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (!createForm.name.trim()) return setCreateError("Name is required");
    if (!createForm.email.trim() && !createForm.phone.trim()) return setCreateError("Email or phone is required");
    if (createForm.password.length < 8) return setCreateError("Password must be at least 8 characters");
    if (createForm.password !== createForm.confirmPassword) return setCreateError("Passwords do not match");

    setCreating(true);
    setCreateError("");
    try {
      await adminApi.createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        password: createForm.password,
        role: createForm.role,
        status: createForm.status,
      });
      setShowCreate(false);
      setPage(1);
      setSearch("");
      setSearchInput("");
      setRoleFilter("");
      setStatusFilter("");
      const data = await adminApi.listUsers({ page: 1, limit: 10 });
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) {
      setCreateError(e.response?.data?.message || "Error creating user");
    } finally {
      setCreating(false);
    }
  }

  const ROLE_LABELS = { CUSTOMER: "Customer", ADMIN: "Admin", SUPER_ADMIN: "Super Admin" };

  // Only a Super Admin can change another Super Admin's role (mirrors the server-side check).
  function canManageRole(u) {
    return u.role !== "SUPER_ADMIN" || currentUser?.role === "SUPER_ADMIN";
  }

  function askRoleChange(u, newRole) {
    if (newRole === u.role) return;
    setActionError("");
    setConfirmAction({
      type: "role",
      user: u,
      newRole,
      title: `Change role to ${ROLE_LABELS[newRole]}?`,
      message: `${u.name} will become a ${ROLE_LABELS[newRole]}, changing what they can access in the Admin Portal immediately.`,
      danger: newRole === "CUSTOMER" || u.role === "SUPER_ADMIN",
    });
  }

  function askStatusChange(u) {
    const newStatus = u.status === "DISABLED" ? "ACTIVE" : "DISABLED";
    setActionError("");
    setConfirmAction({
      type: "status",
      user: u,
      newStatus,
      title: newStatus === "DISABLED" ? "Disable this account?" : "Re-enable this account?",
      message:
        newStatus === "DISABLED"
          ? `${u.name} will be signed out and won't be able to log in until re-enabled.`
          : `${u.name} will be able to log in again.`,
      danger: newStatus === "DISABLED",
    });
  }

  function openEdit(u) {
    setEditError("");
    setEditForm({ name: u.name || "", email: u.email || "", password: "", confirmPassword: "" });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEditUser(u);
  }

  function closeEdit() {
    setEditUser(null);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setEditError("Name is required");
      return;
    }
    if (editForm.password && editForm.password.length < 8) {
      setEditError("Password must be at least 8 characters");
      return;
    }
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      setEditError("Passwords do not match");
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      const payload = { name: editForm.name.trim(), email: editForm.email.trim() };
      if (editForm.password) payload.password = editForm.password;
      const { user: updated } = await adminApi.updateUser(editUser._id, payload);
      setUsers(list => list.map(u => (u._id === updated._id ? updated : u)));
      closeEdit();
    } catch (e) {
      setEditError(e.response?.data?.message || "Error updating user");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    setActing(true);
    setActionError("");
    try {
      let updated;
      if (confirmAction.type === "role") {
        ({ user: updated } = await adminApi.updateUserRole(confirmAction.user._id, confirmAction.newRole));
      } else {
        ({ user: updated } = await adminApi.updateUserStatus(confirmAction.user._id, confirmAction.newStatus));
      }
      setUsers(list => list.map(u => (u._id === updated._id ? updated : u)));
      setConfirmAction(null);
    } catch (e) {
      setActionError(e.response?.data?.message || "Error updating user");
    } finally {
      setActing(false);
    }
  }

  const hasFilters = search || roleFilter || statusFilter || joinedFrom || joinedTo;

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
    setJoinedFrom("");
    setJoinedTo("");
    setPage(1);
  }

  return (
    <div className="p-4 sm:p-8">
      <AdminPageHeader
        title="Users"
        loading={loading}
        subtitle={`${total} account${total !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={openCreate}
            className="bg-white text-brand-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-50 transition-colors shadow-sm"
          >
            + Add User
          </button>
        }
      />

      <div className={FILTER_BAR_CLASS}>
        <div className={FILTER_FIELD_CLASS}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, or phone"
            className={INPUT_CLASS}
          />
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className={INPUT_CLASS}
          >
            <option value="">All roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className={INPUT_CLASS}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2 text-xs text-gray-500">
          Joined
          <input type="date" value={joinedFrom} onChange={(e) => { setJoinedFrom(e.target.value); setPage(1); }} className={`${INPUT_CLASS} w-36`} />
          <span>–</span>
          <input type="date" value={joinedTo} onChange={(e) => { setJoinedTo(e.target.value); setPage(1); }} className={`${INPUT_CLASS} w-36`} />
        </div>
        <ClearFiltersButton show={hasFilters} onClick={clearFilters} />
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <TableSkeleton columns={6} />
      ) : users.length === 0 ? (
        <EmptyState title="No users match these filters." />
      ) : (
        <>
          <div className={`${CARD_CLASS} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => {
                    const isSelf = u._id === currentUser?.id;
                    return (
                      <tr key={u._id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900">{u.name}{isSelf && <span className="text-gray-400 font-normal"> (you)</span>}</p>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {u.email && <p>{u.email}</p>}
                          {u.phone && <p>{u.phone}</p>}
                        </td>
                        <td className="px-5 py-3"><Badge kind="role" status={u.role} /></td>
                        <td className="px-5 py-3"><Badge kind="userStatus" status={u.status} /></td>
                        <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          {canManageRole(u) && (
                            <button onClick={() => openEdit(u)} className="text-brand-600 hover:underline text-xs mr-3">
                              Edit
                            </button>
                          )}
                          {!isSelf && canManageRole(u) && (
                            <select
                              value={u.role}
                              onChange={(e) => askRoleChange(u, e.target.value)}
                              className="text-xs border border-gray-200 rounded-md px-1.5 py-1 mr-3"
                            >
                              <option value="CUSTOMER">Customer</option>
                              <option value="ADMIN">Admin</option>
                              {currentUser?.role === "SUPER_ADMIN" && (
                                <option value="SUPER_ADMIN">Super Admin</option>
                              )}
                            </select>
                          )}
                          {!isSelf && (
                            <button onClick={() => askStatusChange(u)} className="text-red-600 hover:underline text-xs">
                              {u.status === "DISABLED" ? "Enable" : "Disable"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={page} pages={pages} onChange={setPage} />
        </>
      )}

      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && closeEdit()}>
          <div
            className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900 mb-4">Edit {editUser.name}</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className={INPUT_CLASS}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={editForm.password}
                    onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Leave blank to keep current password"
                    className={`${INPUT_CLASS} pr-9`}
                  />
                  <EyeToggleButton visible={showPassword} onClick={() => setShowPassword(v => !v)} />
                </div>
              </div>
              {editForm.password && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={editForm.confirmPassword}
                      onChange={(e) => setEditForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      className={`${INPUT_CLASS} pr-9`}
                    />
                    <EyeToggleButton visible={showConfirmPassword} onClick={() => setShowConfirmPassword(v => !v)} />
                  </div>
                </div>
              )}

              {editError && <p className="text-red-600 text-xs">{editError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !acting && setConfirmAction(null)}>
          <div
            className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900 mb-2">{confirmAction.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{confirmAction.message}</p>

            {actionError && <p className="text-red-600 text-xs mb-3">{actionError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={acting}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                  confirmAction.danger
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                }`}
              >
                {acting ? "Please wait…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={acting}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !creating && setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-4">Add User</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  className={INPUT_CLASS}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={createForm.phone}
                    onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-1">At least one of email or phone is required.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    value={createForm.password}
                    onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    className={`${INPUT_CLASS} pr-9`}
                    required
                  />
                  <EyeToggleButton visible={showCreatePassword} onClick={() => setShowCreatePassword(v => !v)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type={showCreatePassword ? "text" : "password"}
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className={INPUT_CLASS}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="ADMIN">Admin</option>
                    {currentUser?.role === "SUPER_ADMIN" && <option value="SUPER_ADMIN">Super Admin</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm(f => ({ ...f, status: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              </div>

              {createError && <p className="text-red-600 text-xs">{createError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? "Creating…" : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
