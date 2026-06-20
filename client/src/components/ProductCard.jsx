import { useState } from "react";
import { Link } from "react-router-dom";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";
import WishlistButton from "./WishlistButton";
import StarRating from "./StarRating";
import { CARD_CLASS } from "../utils/ui";

const formatPrice = (price) => `Rs. ${Number(price).toLocaleString()}`;

export default function ProductCard({ product }) {
  const image = product.images?.[0];
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <Link
      to={`/products/${product.slug}`}
      className={`group block ${CARD_CLASS} overflow-hidden hover:shadow-md transition-shadow`}
    >
      <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
        <WishlistButton
          product={product}
          className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 text-gray-500 hover:text-red-500 shadow-sm"
          iconClassName="w-4 h-4"
        />
        {image && !imageFailed ? (
          <img
            src={cloudinaryUrl(image.url, 400)}
            alt={image.altText || product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
            No image
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-brand-600 mb-0.5">{product.categories?.map((c) => c.name).join(", ")}</p>
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.name}</h3>
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1 mb-1">
            <StarRating rating={product.averageRating} />
            <span className="text-xs text-gray-400">({product.reviewCount})</span>
          </div>
        )}
        <p className="text-sm font-semibold text-gray-900">{formatPrice(product.basePrice)}</p>
      </div>
    </Link>
  );
}
