import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { pingAdmin } from "../api/admin";
import { getErrorMessage } from "../utils/errorHelpers";
import { FormError } from "../components/FormError";
import { BUTTON_CLASS } from "../utils/ui";

function Badge({ ok, label }) {
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${
        ok ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {label}: {ok ? "yes" : "no"}
    </span>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");
  const [pinging, setPinging] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  async function handlePingAdmin() {
    setAdminMessage("");
    setAdminError("");
    setPinging(true);
    try {
      const { message } = await pingAdmin();
      setAdminMessage(message);
    } catch (err) {
      setAdminError(getErrorMessage(err));
    } finally {
      setPinging(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Welcome, {user.name}</h1>

      <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Email:</span> {user.email || "—"}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Phone:</span> {user.phone || "—"}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Role:</span> {user.role}
        </p>
        <div className="flex gap-2">
          <Badge ok={user.emailVerified} label="Email verified" />
          <Badge ok={user.phoneVerified} label="Phone verified" />
        </div>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-md p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Role-gated test route</p>
        <FormError message={adminError} />
        {adminMessage && (
          <div className="rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 mb-4">
            {adminMessage}
          </div>
        )}
        <button onClick={handlePingAdmin} className={BUTTON_CLASS} disabled={pinging}>
          {pinging ? "Pinging..." : "Ping admin route"}
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="mt-6 text-sm text-red-600 hover:text-red-700 font-medium"
      >
        Log out
      </button>
    </div>
  );
}
