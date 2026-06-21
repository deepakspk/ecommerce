import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as categoriesApi from "../api/categories";
import { useCompanySettings } from "../hooks/useCompanySettings";
import { CONTAINER_CLASS } from "../utils/ui";

const SOCIAL_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
};

function socialHref(platform, value) {
  if (/^https?:\/\//i.test(value)) return value;
  return platform === "whatsapp" ? `https://wa.me/${value.replace(/[^0-9]/g, "")}` : value;
}

const SOCIAL_ICONS = {
  facebook: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8h-2a2 2 0 0 0-2 2v2H9m3 0H9m3 0v8M9 12h3" />
    </svg>
  ),
  instagram: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="16.5" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  tiktok: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5c.17 0 .34.01.5.03" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 4c0 2.5 2 4.5 4.5 4.5" />
    </svg>
  ),
  linkedin: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="8.5" cy="8.5" r="0.9" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 11v6M13 17v-3.5a2 2 0 1 1 4 0V17M13 13.5v-2.3" />
    </svg>
  ),
  twitter: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l14 14M19 5 5 19" />
    </svg>
  ),
  youtube: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3.5" y="6" width="17" height="12" rx="3" />
      <path d="M11 9.7v4.6l4-2.3-4-2.3Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  whatsapp: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 18l-3 1 1-3a7.5 7.5 0 1 1 2 2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10c0 3 2 5 5 5" />
    </svg>
  ),
};

const DEFAULT_SOCIAL_ICON = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="12" cy="12" r="8" />
    <path strokeLinecap="round" d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16" />
  </svg>
);

function FooterHeading({ children }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wide text-secondary-contrast border-l-2 border-brand-600 pl-2 mb-4">
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
  const { company } = useCompanySettings();

  useEffect(() => {
    categoriesApi.getCategoryTree()
      .then((d) => setCategories(d.tree.slice(0, 5)))
      .catch(() => setCategories([]));
  }, []);

  const companyName = company.companyName || "Ecommerce Nepal";
  const socialEntries = Object.entries(company.social || {}).filter(([, value]) => value?.trim());

  return (
    <footer className="border-t border-secondary-contrast/10 bg-secondary mt-12">
      <div className={`${CONTAINER_CLASS} py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10`}>
        {/* Brand */}
        <div>
          <Link to="/" className="text-lg font-bold text-secondary-contrast flex items-center gap-2">
            {company.logoUrl && <img src={company.logoUrl} alt={companyName} className="h-11 w-auto" />}
            {companyName}
          </Link>
          <p className="text-sm text-secondary-contrast/70 mt-3 leading-relaxed">
            {company.description || "Bringing quality products to your doorstep, anywhere in Nepal."}
          </p>
        </div>

        {/* Categories */}
        <div>
          <FooterHeading>Categories</FooterHeading>
          {categories.length === 0 ? (
            <p className="text-xs text-secondary-contrast/50">No categories yet</p>
          ) : (
            <ul className="space-y-2 text-sm text-secondary-contrast/70">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link to={`/products?category=${cat.slug}`} className="hover:text-secondary-contrast">
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
          <ul className="space-y-2 text-sm text-secondary-contrast/70">
            <li><Link to="/cart" className="hover:text-secondary-contrast">Shopping Cart</Link></li>
            <li><Link to="/wishlist" className="hover:text-secondary-contrast">My Wishlist</Link></li>
            <li><Link to="/orders" className="hover:text-secondary-contrast">My Orders</Link></li>
            <li><Link to="/products" className="hover:text-secondary-contrast">All Products</Link></li>
          </ul>
        </div>

        {/* Customer Support */}
        <div>
          <FooterHeading>Customer Support</FooterHeading>
          <p className="text-sm text-secondary-contrast/70 mb-4">
            {company.address || "Need help with your order? We're here to assist you."}
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <IconCircle>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a1.5 1.5 0 0 0 1.5-1.5v-2.379a1 1 0 0 0-.62-.925l-3.879-1.55a1 1 0 0 0-1.06.22l-1.07 1.07a11.25 11.25 0 0 1-5.477-5.477l1.07-1.07a1 1 0 0 0 .22-1.06l-1.55-3.879a1 1 0 0 0-.926-.62H3.75a1.5 1.5 0 0 0-1.5 1.5v.75Z" />
                </svg>
              </IconCircle>
              <div>
                <p className="text-xs text-secondary-contrast/50">Call us</p>
                <p className="text-sm font-medium text-secondary-contrast/90">{company.phone || "+977-1XXXXXXX"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <IconCircle>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </IconCircle>
              <div>
                <p className="text-xs text-secondary-contrast/50">Email us</p>
                <p className="text-sm font-medium text-secondary-contrast/90">{company.email || "support@ecommercenepal.com"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social + we accept */}
      <div className="border-t border-secondary-contrast/10">
        <div className={`${CONTAINER_CLASS} py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6`}>
          {socialEntries.length > 0 && (
            <div>
              <FooterHeading>Social Media</FooterHeading>
              <div className="flex flex-wrap gap-2">
                {socialEntries.map(([platform, value]) => (
                <a
                  key={platform}
                  href={socialHref(platform, value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL_LABELS[platform] || platform}
                  className="w-8 h-8 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition-colors flex-shrink-0"
                >
                  {SOCIAL_ICONS[platform] || DEFAULT_SOCIAL_ICON}
                </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <FooterHeading>We Accept</FooterHeading>
            <div className="flex flex-wrap gap-2 sm:justify-end">
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
      </div>

      {/* Bottom bar */}
      <div className="border-t border-secondary-contrast/10">
        <div className={`${CONTAINER_CLASS} py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-secondary-contrast/50`}>
          <p>© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          <span>Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}
