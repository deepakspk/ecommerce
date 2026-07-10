import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";

const AUTO_SCROLL_MS = 3500;

function ArrowButton({ direction, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-500 flex items-center justify-center shadow-sm hover:text-brand-600 hover:border-brand-200 hover:shadow-md transition-all disabled:opacity-0 disabled:pointer-events-none"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={direction === "left" ? "M15.75 19.5L8.25 12l7.5-7.5" : "M8.25 4.5l7.5 7.5-7.5 7.5"}
        />
      </svg>
    </button>
  );
}

const TILE_CLASS = "w-28 sm:w-32 lg:w-36 flex-shrink-0 snap-start";

export default function CategoryRail({ categories, loading = false }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [paused, setPaused] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return undefined;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [categories, updateScrollState]);

  // Keep the rail drifting on its own so shoppers notice it scrolls; pause
  // while hovered/touched and skip entirely for reduced-motion users.
  useEffect(() => {
    if (paused || !(canScrollLeft || canScrollRight)) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: el.clientWidth * 0.5, behavior: "smooth" });
    }, AUTO_SCROLL_MS);
    return () => clearInterval(id);
  }, [paused, canScrollLeft, canScrollRight]);

  function scrollByCards(direction) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  }

  if (loading) {
    return (
      <div className="flex gap-3 sm:gap-4 overflow-hidden">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={`${TILE_CLASS} rounded-xl border border-gray-200 bg-white overflow-hidden animate-pulse`}>
            <div className="aspect-square bg-gray-200" />
            <div className="px-3 py-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) return null;

  const showArrows = canScrollLeft || canScrollRight;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {showArrows && (
        <>
          <div className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10">
            <ArrowButton direction="left" onClick={() => scrollByCards(-1)} disabled={!canScrollLeft} />
          </div>
          <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
            <ArrowButton direction="right" onClick={() => scrollByCards(1)} disabled={!canScrollRight} />
          </div>
        </>
      )}

      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x pb-1"
      >
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/products?category=${cat.slug}`}
            className={`${TILE_CLASS} group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow`}
          >
            <div className="aspect-square bg-gray-100 overflow-hidden p-6">
              {cat.image ? (
                <img
                  src={cloudinaryUrl(cat.image, 240)}
                  alt={cat.name}
                  loading="lazy"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-gray-300">
                  {cat.name.charAt(0)}
                </div>
              )}
            </div>
            <p className="px-3 py-2 text-sm font-medium text-gray-700 group-hover:text-brand-600 truncate">
              {cat.name}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
