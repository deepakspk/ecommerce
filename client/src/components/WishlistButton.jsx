import { useState } from "react";
import { useWishlist } from "../hooks/useWishlist";

export default function WishlistButton({ product, className = "", iconClassName = "w-5 h-5" }) {
  const { isWishlisted, toggleItem } = useWishlist();
  const [pending, setPending] = useState(false);
  const active = isWishlisted(product._id);

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      await toggleItem(product);
    } catch {
      // non-critical UI action — silently ignore, state simply won't change
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      className={`${className} ${active ? "!text-red-500" : ""}`}
    >
      <svg
        className={iconClassName}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    </button>
  );
}
