import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as categoriesApi from "../api/categories";
import { MUTED_CLASS, CONTAINER_CLASS } from "../utils/ui";

function FooterHeading({ children }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900 border-l-2 border-brand-600 pl-2 mb-4">
      {children}
    </h3>
  );
}

function IconCircle({ children }) {
  return (
    <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center flex-shrink-0">
      {children}
    </div>
  );
}

const PAYMENT_METHODS = ["Cash on Delivery", "eSewa", "Khalti"];

export default function Footer() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    categoriesApi.getCategoryTree()
      .then((d) => setCategories(d.tree.slice(0, 5)))
      .catch(() => setCategories([]));
  }, []);

  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-12">
      <div className={`${CONTAINER_CLASS} py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10`}>
        {/* Brand */}
        <div>
          <Link to="/" className="text-lg font-bold text-gray-900">
            Ecommerce Nepal
          </Link>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            Bringing quality products to your doorstep, anywhere in Nepal.
          </p>
        </div>

        {/* Categories */}
        <div>
          <FooterHeading>Categories</FooterHeading>
          {categories.length === 0 ? (
            <p className={MUTED_CLASS}>No categories yet</p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-600">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link to={`/products?category=${cat.slug}`} className="hover:text-brand-600">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <FooterHeading>Quick Links</FooterHeading>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link to="/cart" className="hover:text-brand-600">Shopping Cart</Link></li>
            <li><Link to="/wishlist" className="hover:text-brand-600">My Wishlist</Link></li>
            <li><Link to="/orders" className="hover:text-brand-600">My Orders</Link></li>
            <li><Link to="/products" className="hover:text-brand-600">All Products</Link></li>
          </ul>
        </div>

        {/* Customer Support */}
        <div>
          <FooterHeading>Customer Support</FooterHeading>
          <p className="text-sm text-gray-500 mb-4">
            Need help with your order? We're here to assist you.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <IconCircle>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a1.5 1.5 0 0 0 1.5-1.5v-2.379a1 1 0 0 0-.62-.925l-3.879-1.55a1 1 0 0 0-1.06.22l-1.07 1.07a11.25 11.25 0 0 1-5.477-5.477l1.07-1.07a1 1 0 0 0 .22-1.06l-1.55-3.879a1 1 0 0 0-.926-.62H3.75a1.5 1.5 0 0 0-1.5 1.5v.75Z" />
                </svg>
              </IconCircle>
              <div>
                <p className="text-xs text-gray-400">Call us</p>
                <p className="text-sm font-medium text-gray-700">+977-1XXXXXXX</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <IconCircle>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </IconCircle>
              <div>
                <p className="text-xs text-gray-400">Email us</p>
                <p className="text-sm font-medium text-gray-700">support@ecommercenepal.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* We accept */}
      <div className="border-t border-gray-200">
        <div className={`${CONTAINER_CLASS} py-6`}>
          <FooterHeading>We Accept</FooterHeading>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => (
              <span
                key={method}
                className="inline-block text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-200">
        <div className={`${CONTAINER_CLASS} py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400`}>
          <p>© {new Date().getFullYear()} Ecommerce Nepal. All rights reserved.</p>
          <span>Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}
