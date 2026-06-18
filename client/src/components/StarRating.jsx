const SIZE_CLASSES = { sm: "w-3.5 h-3.5", md: "w-5 h-5", lg: "w-7 h-7" };

function StarIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 20 20" fill={filled ? "currentColor" : "none"} stroke="currentColor" className={className}>
      <path
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
        d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z"
      />
    </svg>
  );
}

export default function StarRating({ rating = 0, size = "sm", interactive = false, onChange }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(rating);
        const colorClass = filled ? "text-amber-400" : "text-gray-300";

        return interactive ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={`${sizeClass} ${colorClass} hover:text-amber-400 transition-colors`}
          >
            <StarIcon filled={filled} className="w-full h-full" />
          </button>
        ) : (
          <span key={n} className={`${sizeClass} ${colorClass}`}>
            <StarIcon filled={filled} className="w-full h-full" />
          </span>
        );
      })}
    </div>
  );
}
