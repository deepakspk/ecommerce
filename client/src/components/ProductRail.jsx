import { useRef, useState, useEffect, useCallback } from "react";
import ProductCard from "./ProductCard";

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

export default function ProductRail({ title, products, layout = "scroll" }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    if (layout !== "scroll") return undefined;
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return undefined;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [layout, products, updateScrollState]);

  function scrollByCards(direction) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  }

  if (!products || products.length === 0) return null;

  const showArrows = layout === "scroll" && (canScrollLeft || canScrollRight);

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {showArrows && (
          <div className="hidden sm:flex items-center gap-2">
            <ArrowButton direction="left" onClick={() => scrollByCards(-1)} disabled={!canScrollLeft} />
            <ArrowButton direction="right" onClick={() => scrollByCards(1)} disabled={!canScrollRight} />
          </div>
        )}
      </div>

      {layout === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-1 -mx-1 px-1"
        >
          {products.map((product) => (
            <div key={product._id} className="w-40 sm:w-48 md:w-52 flex-shrink-0 snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
