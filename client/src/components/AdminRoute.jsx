import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function AdminRoute({ children, superAdminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return <Navigate to="/" replace />;
  if (superAdminOnly && user.role !== "SUPER_ADMIN") return <Navigate to="/admin/dashboard" replace />;
  return children;
}
