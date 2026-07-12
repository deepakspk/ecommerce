import { useState, useEffect } from "react";
import * as promotionsApi from "../api/promotions";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";

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
    <div className="rounded-xl overflow-hidden bg-gray-100">
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

export default function HomePromotions() {
  const [promotions, setPromotions] = useState([]);
  const [popupPromotion, setPopupPromotion] = useState(null);

  useEffect(() => {
    let ignore = false;
    promotionsApi.getActivePromotions()
      .then(({ promotions: data }) => {
        if (ignore) return;
        setPromotions(data);
        const seen = seenPopups();
        const withPopup = data.find(
          (p) => (p.webPopupUrl || p.mobilePopupUrl) && !seen.includes(p._id)
        );
        if (withPopup) setPopupPromotion(withPopup);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  function closePopup() {
    markPopupSeen(popupPromotion._id);
    setPopupPromotion(null);
  }

  if (promotions.length === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      {promotions.map((promotion) => (
        <PromotionBanner key={promotion._id} promotion={promotion} />
      ))}
      {popupPromotion && <PromotionPopup promotion={popupPromotion} onClose={closePopup} />}
    </div>
  );
}
