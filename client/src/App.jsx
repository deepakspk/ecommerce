import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import AuthProvider from "./context/AuthProvider";
import CartProvider from "./context/CartProvider";
import WishlistProvider from "./context/WishlistProvider";
import CompanySettingsProvider from "./context/CompanySettingsProvider";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminSection from "./pages/admin/AdminSection";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import OtpLoginPage from "./pages/OtpLoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import WishlistPage from "./pages/WishlistPage";
import AddressesPage from "./pages/AddressesPage";
import CheckoutPage from "./pages/CheckoutPage";
import KhaltiCallbackPage from "./pages/KhaltiCallbackPage";
import EsewaCallbackPage from "./pages/EsewaCallbackPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import OrdersPage from "./pages/OrdersPage";
import NotFoundPage from "./pages/NotFoundPage";

function StoreLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return (
    <CompanySettingsProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <BrowserRouter>
              <Routes>
                {/* Admin section — has its own layout (dark sidebar), no store Navbar */}
                <Route path="/admin/*" element={<AdminSection />} />

                {/* Store pages — wrapped in Layout (Navbar + main) */}
                <Route element={<StoreLayout />}>
                  <Route path="/" element={<ProductsPage />} />
                  <Route
                    path="/account"
                    element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
                  />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                  <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
                  <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
                  <Route path="/otp-login" element={<OtpLoginPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/products/:slug" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route
                    path="/addresses"
                    element={<ProtectedRoute><AddressesPage /></ProtectedRoute>}
                  />
                  <Route
                    path="/checkout"
                    element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>}
                  />
                  <Route
                    path="/payment/khalti/callback"
                    element={<ProtectedRoute><KhaltiCallbackPage /></ProtectedRoute>}
                  />
                  <Route
                    path="/payment/esewa/callback"
                    element={<ProtectedRoute><EsewaCallbackPage /></ProtectedRoute>}
                  />
                  <Route
                    path="/orders"
                    element={<ProtectedRoute><OrdersPage /></ProtectedRoute>}
                  />
                  <Route
                    path="/orders/:id"
                    element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>}
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </CompanySettingsProvider>
  );
}
