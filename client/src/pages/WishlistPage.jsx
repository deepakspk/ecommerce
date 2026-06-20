import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWishlist } from "../hooks/useWishlist";
import { useCart } from "../hooks/useCart";
import * as productsApi from "../api/products";
import { getErrorMessage } from "../utils/errorHelpers";
import ItemThumb from "../components/ItemThumb";
import { CARD_CLASS, H1_CLASS } from "../utils/ui";

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;

export default function WishlistPage() {
  const { items, itemCount, removeItem, clearWishlist } = useWishlist();
  const { addItem: addToCart } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [movingId, setMovingId] = useState(null);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
        <p className="text-gray-500 text-lg mb-2">Your wishlist is empty</p>
        <Link to="/products" className="text-brand-600 hover:underline text-sm">
          Browse products →
        </Link>
      </div>
    );
  }

  async function handleRemove(productId) {
    setError("");
    try { await removeItem(productId); }
    catch (e) { setError(e.response ? getErrorMessage(e) : e.message); }
  }

  async function handleClear() {
    setError("");
    try { await clearWishlist(); }
    catch (e) { setError(e.response ? getErrorMessage(e) : e.message); }
  }

  // Wishlist items only know the product, not a size/color — if there's exactly
  // one variant we can move it straight to the cart, otherwise send the user to
  // the product page to pick a size/color.
  async function handleMoveToCart(item) {
    setError("");
    setMovingId(item.productId);
    try {
      const { product, variants } = await productsApi.getProduct(item.productSlug);

      if (variants.length === 0) {
        setError(`${item.productName} has no purchasable options right now.`);
        return;
      }
      if (variants.length > 1) {
        navigate(`/products/${item.productSlug}`);
        return;
      }

      const variant = variants[0];
      if (variant.stockQuantity < 1) {
        setError(`${item.productName} is out of stock.`);
        return;
      }

      await addToCart(variant._id, 1, variant, product);
      await removeItem(item.productId);
    } catch (e) {
      setError(e.response ? getErrorMessage(e) : e.message);
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className={H1_CLASS}>
          Wishlist <span className="text-gray-400 font-normal text-lg">({itemCount} item{itemCount !== 1 ? "s" : ""})</span>
        </h1>
        <button onClick={handleClear} className="text-sm text-red-500 hover:text-red-700">
          Clear wishlist
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>
      )}

      {/* Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <WishlistItem
            key={item.productId}
            item={item}
            onRemove={handleRemove}
            onMoveToCart={handleMoveToCart}
            moving={movingId === item.productId}
          />
        ))}
      </div>

      <Link to="/products" className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-8">
        ← Continue shopping
      </Link>
    </div>
  );
}

function WishlistItem({ item, onRemove, onMoveToCart, moving }) {
  return (
    <div className={`flex gap-4 ${CARD_CLASS} p-4 items-start`}>
      {/* Image */}
      <Link to={`/products/${item.productSlug}`} className="flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden bg-gray-100">
        <ItemThumb src={item.imageUrl} alt={item.productName} width={150} className="w-full h-full" />
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link to={`/products/${item.productSlug}`} className="text-sm font-semibold text-gray-900 hover:underline line-clamp-2 leading-snug">
          {item.productName}
        </Link>
        <p className="text-sm font-medium text-gray-800 mt-1">{fmt(item.basePrice)}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <button onClick={() => onRemove(item.productId)} className="text-xs text-gray-400 hover:text-red-500">
          Remove
        </button>
        <button
          onClick={() => onMoveToCart(item)}
          disabled={moving}
          className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 whitespace-nowrap"
        >
          {moving ? "Moving…" : "Move to Cart"}
        </button>
      </div>
    </div>
  );
}
