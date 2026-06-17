import { Routes, Route, Navigate } from "react-router-dom";
import AdminRoute from "../../components/AdminRoute";
import AdminLayout from "../../components/AdminLayout";
import DashboardPage from "./DashboardPage";
import CategoriesPage from "./CategoriesPage";
import ProductsPage from "./ProductsPage";
import ProductFormPage from "./ProductFormPage";
import InventoryPage from "./InventoryPage";
import AdminOrdersPage from "./AdminOrdersPage";
import AdminOrderDetailPage from "./AdminOrderDetailPage";

export default function AdminSection() {
  return (
    <AdminRoute>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          <Route path="inventory" element={<InventoryPage />} />
        </Route>
      </Routes>
    </AdminRoute>
  );
}
