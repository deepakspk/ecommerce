import { useState } from "react";
import { Link } from "react-router-dom";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";
import WishlistButton from "./WishlistButton";
import StarRating from "./StarRating";
import * as productsApi from "../api/products";
import { useCart } from "../hooks/useCart";
import { getErrorMessage } from "../utils/errorHelpers";
import { BUTTON_PRIMARY_FULL } from "../utils/ui";
import { getEffectivePricing } from "../utils/pricing";

const formatPrice = (price) => `Rs. ${Number(price).toLocaleString()}`;

export default function ProductCard({ product }) {
  const image = product.images?.[0];
  const secondImage = product.images?.[1];
  const [imageFailed, setImageFailed] = useState(false);
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState("");

  // 0 or 1 variants total means there's no real choice to make, so the card can
  // safely auto-pick it. Anything more and we send the shopper to the product page
  // instead of silently guessing a size/color for them.
  const needsOptionSelection = (product.variantCount ?? 0) > 1;

  async function handleAddToCart(e) {
    if (needsOptionSelection) return; // let the click bubble up to the card's <Link>
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    setCartError("");
    try {
      const { product: fullProduct, variants } = await productsApi.getProduct(product.slug);
      const inStockVariant = variants.find((v) => v.stockQuantity > 0);
      if (!inStockVariant) {
        setCartError("Out of stock");
        return;
      }
      await addItem(inStockVariant._id, 1, inStockVariant, fullProduct);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      setCartError(err.response ? getErrorMessage(err) : err.message);
    } finally {
      setAdding(false);
    }
  }

  // campaignPrice rides along on products served by the API while a campaign
  // is running, so campaign deals show up wherever the product appears.
  const { finalPrice, discountPercent, hasDiscount } = getEffectivePricing(product.basePrice, product);

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {hasDiscount && (
          <span className="absolute top-2.5 left-2.5 z-10 bg-brand-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
            -{discountPercent}%
          </span>
        )}
        <WishlistButton
          product={product}
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/95 text-gray-500 hover:text-red-500 shadow-md ring-1 ring-black/5"
          iconClassName="w-4 h-4"
        />
        {image && !imageFailed ? (
          <>
            <img
              src={cloudinaryUrl(image.url, 400)}
              alt={image.altText || product.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${secondImage ? "group-hover:opacity-0" : "group-hover:scale-105 transition-transform"}`}
            />
            {secondImage && (
              <img
                src={cloudinaryUrl(secondImage.url, 400)}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
            No image
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-1 min-h-[2.5em]">
          {product.name}
        </h3>

        <div className="flex items-center gap-1.5 mb-1.5 min-h-[1.1rem]">
          {product.reviewCount > 0 ? (
            <>
              <StarRating rating={product.averageRating} />
              <span className="text-xs text-gray-400">({product.reviewCount})</span>
            </>
          ) : (
            <span className="text-xs text-gray-300">No ratings yet</span>
          )}
        </div>

        {hasDiscount ? (
          <p className="mb-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-base font-bold text-brand-600">{formatPrice(finalPrice)}</span>
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.basePrice)}</span>
          </p>
        ) : (
          <p className="text-base font-bold text-gray-900 mb-2">{formatPrice(product.basePrice)}</p>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={adding}
          className={`${BUTTON_PRIMARY_FULL} !rounded-xl !py-1.5 ${added ? "!bg-green-600" : ""}`}
        >
          {added ? "Added!" : adding ? "Adding…" : needsOptionSelection ? "Select Options" : "Add to Cart"}
        </button>
        {cartError && <p className="text-xs text-red-600 mt-1.5">{cartError}</p>}
      </div>
    </Link>
  );
}
