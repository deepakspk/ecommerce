import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as productsApi from "../api/products";
import * as promotionsApi from "../api/promotions";
import { getActiveFeatureTypes } from "../api/featureTypes";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";
import ProductCard from "./ProductCard";
import ProductCarousel from "./ProductCarousel";

const RAIL_PRODUCT_LIMIT = 10;

// Shown once per browser session, then remembered per promotion so a new
// promotion still gets its own popup.
const POPUP_SEEN_KEY = "promo_popup_seen";

function seenPopups() {
  try {
    return JSON.parse(sessionStorage.getItem(POPUP_SEEN_KEY)) || [];
  } catch {
    return [];
  }
}

function markPopupSeen(id) {
  try {
    sessionStorage.setItem(POPUP_SEEN_KEY, JSON.stringify([...seenPopups(), id]));
  } catch {
    // sessionStorage unavailable (private mode) — popup just reappears next visit
  }
}

function PromotionBanner({ promotion }) {
  const mobileSrc = promotion.mobileBannerUrl || promotion.webBannerUrl;
  return (
    <div className="rounded-2xl overflow-hidden bg-gray-100">
      {/* Web banner on sm+ screens, mobile banner (or web fallback) below */}
      <img
        src={cloudinaryUrl(promotion.webBannerUrl, 1400)}
        alt={promotion.title}
        loading="lazy"
        className="hidden sm:block w-full h-auto"
      />
      <img
        src={cloudinaryUrl(mobileSrc, 800)}
        alt={promotion.title}
        loading="lazy"
        className="sm:hidden w-full h-auto"
      />
    </div>
  );
}

function PromotionPopup({ promotion, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mobileSrc = promotion.mobilePopupUrl || promotion.webPopupUrl;
  const webSrc = promotion.webPopupUrl || promotion.mobilePopupUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={promotion.title}
    >
      <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close promotion"
          className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white text-gray-700 shadow-lg flex items-center justify-center hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={cloudinaryUrl(webSrc, 600)}
          alt={promotion.title}
          className="hidden sm:block w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl"
        />
        <img
          src={cloudinaryUrl(mobileSrc, 480)}
          alt={promotion.title}
          className="sm:hidden w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl"
        />
      </div>
    </div>
  );
}

function FeatureSection({ featureType, products }) {
  return (
    <section
      aria-label={featureType.name}
      className="rounded-2xl p-4 sm:p-6 bg-white border border-gray-100 shadow-sm"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385c.116.483-.412.863-.833.6l-4.725-2.885a.563.563 0 0 0-.586 0L6.99 20.63c-.421.263-.949-.117-.833-.6l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 0 0 .475-.345l2.125-5.111Z"
            />
          </svg>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 truncate min-w-0">{featureType.name}</h2>
        <Link
          to={`/products?featureType=${featureType.slug}`}
          className="ml-auto flex-shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          View All
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>

      <div className="border-t border-gray-100 my-4" />

      <ProductCarousel>
        {products.map((product) => (
          <div key={product._id} className="w-44 sm:w-52 flex-shrink-0 snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </ProductCarousel>
    </section>
  );
}

// Home sections below the campaigns: feature-type product carousels (Best
// Seller, New Arrival, …) interleaved with promotion banners — rail, banner,
// rail, banner… Feature types with no products are skipped, and promotions
// left over after the last rail are stacked at the end so every live banner
// still shows. The once-per-session promotion popup also lives here.
export default function HomeShowcase() {
  const [rails, setRails] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [popupPromotion, setPopupPromotion] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const [featureTypesRes, promotionsRes] = await Promise.all([
        getActiveFeatureTypes().catch(() => ({ featureTypes: [] })),
        promotionsApi.getActivePromotions().catch(() => ({ promotions: [] })),
      ]);

      const loadedRails = await Promise.all(
        featureTypesRes.featureTypes.map((featureType) =>
          productsApi.getProducts({ featureType: featureType.slug, limit: RAIL_PRODUCT_LIMIT })
            .then((d) => ({ featureType, products: d.products }))
            .catch(() => ({ featureType, products: [] }))
        )
      );

      if (ignore) return;
      setRails(loadedRails.filter((rail) => rail.products.length > 0));
      setPromotions(promotionsRes.promotions);

      const seen = seenPopups();
      const withPopup = promotionsRes.promotions.find(
        (p) => (p.webPopupUrl || p.mobilePopupUrl) && !seen.includes(p._id)
      );
      if (withPopup) setPopupPromotion(withPopup);
    }

    load();
    return () => { ignore = true; };
  }, []);

  function closePopup() {
    markPopupSeen(popupPromotion._id);
    setPopupPromotion(null);
  }

  if (rails.length === 0 && promotions.length === 0 && !popupPromotion) return null;

  // rail, banner, rail, banner… then any promotions beyond the rail count
  const sections = [];
  rails.forEach((rail, i) => {
    sections.push(<FeatureSection key={`ft-${rail.featureType.slug}`} {...rail} />);
    if (promotions[i]) {
      sections.push(<PromotionBanner key={`promo-${promotions[i]._id}`} promotion={promotions[i]} />);
    }
  });
  promotions.slice(rails.length).forEach((promotion) => {
    sections.push(<PromotionBanner key={`promo-${promotion._id}`} promotion={promotion} />);
  });

  return (
    <div className="space-y-8">
      {sections}
      {popupPromotion && <PromotionPopup promotion={popupPromotion} onClose={closePopup} />}
    </div>
  );
}
