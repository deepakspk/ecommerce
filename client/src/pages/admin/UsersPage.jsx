import { useState, useEffect } from "react";
import * as adminApi from "../../api/admin";
import Badge from "../../components/Badge";
import Pagination from "../../components/Pagination";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { H1_CLASS, CARD_CLASS, INPUT_CLASS } from "../../utils/ui";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NP", { day: "2-digit", month: "short", year: "numeric" });
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [confirmAction, setConfirmAction] = useState(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = { page, limit: 25 };
        if (search.trim()) params.search = search.trim();
        if (roleFilter) params.role = roleFilter;
        if (statusFilter) params.status = statusFilter;
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
  }, [page, search, roleFilter, statusFilter]);

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

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={H1_CLASS}>Users</h1>
          {!loading && <p className="text-sm text-gray-400 mt-0.5">{total} account{total !== 1 ? "s" : ""}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, email, or phone"
          className={`${INPUT_CLASS} max-w-xs`}
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className={`${INPUT_CLASS} w-auto`}
        >
          <option value="">All roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className={`${INPUT_CLASS} w-auto`}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : users.length === 0 ? (
        <EmptyState title="No users found." />
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
    </div>
  );
}
