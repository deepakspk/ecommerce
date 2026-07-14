import { useState, useEffect, useRef, useCallback } from "react";

function CarouselArrow({ direction, onClick, visible }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-500 items-center justify-center shadow-md hover:text-brand-600 hover:border-brand-200 transition-all ${
        direction === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"
      }`}
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

// Arrow-driven horizontal carousel — native scrollbar hidden (no-scrollbar),
// so touch/trackpad swiping still works but the UI stays clean. Used by the
// home campaign sections and feature-type rails.
export default function ProductCarousel({ children }) {
  const railRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = railRef.current;
    if (!el) return undefined;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  function scrollByPage(direction) {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <CarouselArrow direction="left" onClick={() => scrollByPage(-1)} visible={canLeft} />
      <div
        ref={railRef}
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-1 -mx-1 px-1"
      >
        {children}
      </div>
      <CarouselArrow direction="right" onClick={() => scrollByPage(1)} visible={canRight} />
    </div>
  );
}
