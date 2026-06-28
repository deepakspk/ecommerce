import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../utils/errorHelpers";
import ItemThumb from "../components/ItemThumb";
import { CARD_CLASS, H1_CLASS } from "../utils/ui";
import { getDiscountedPrice } from "../utils/pricing";

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;

export default function CartPage() {
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const [error, setError] = useState("");

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.25 3h1.386c.51 0 .955.343 1.087.836l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.273M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
        <p className="text-gray-500 text-lg mb-2">Your cart is empty</p>
        <Link to="/products" className="text-brand-600 hover:underline text-sm">
          Browse products →
        </Link>
      </div>
    );
  }

  async function handleQtyChange(variantId, qty) {
    setError("");
    try { await updateQuantity(variantId, qty); }
    catch (e) { setError(e.response ? getErrorMessage(e) : e.message); }
  }

  async function handleRemove(variantId) {
    setError("");
    try { await removeItem(variantId); }
    catch (e) { setError(e.response ? getErrorMessage(e) : e.message); }
  }

  async function handleClear() {
    setError("");
    try { await clearCart(); }
    catch (e) { setError(e.response ? getErrorMessage(e) : e.message); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className={H1_CLASS}>
          Cart <span className="text-gray-400 font-normal text-lg">({itemCount} item{itemCount !== 1 ? "s" : ""})</span>
        </h1>
        <button onClick={handleClear} className="text-sm text-red-500 hover:text-red-700">
          Clear cart
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>
      )}

      {/* Items */}
      <div className="space-y-3 mb-8">
        {items.map((item) => (
          <CartItem key={item.variantId} item={item} onQtyChange={handleQtyChange} onRemove={handleRemove} />
        ))}
      </div>

      {/* Summary */}
      <div className="border-t border-gray-200 pt-6 max-w-sm ml-auto">
        <div className="flex justify-between text-base font-semibold text-gray-900 mb-1">
          <span>Subtotal</span>
          <span>{fmt(subtotal)}</span>
        </div>
        <p className="text-xs text-gray-400 mb-5">Delivery fee calculated at checkout</p>

        {user ? (
          <Link to="/checkout"
            className="block w-full bg-brand-600 text-white py-3 rounded-lg font-semibold text-sm text-center hover:bg-brand-700 transition-colors">
            Proceed to Checkout
          </Link>
        ) : (
          <Link to="/login?redirect=/checkout"
            className="block w-full bg-brand-600 text-white py-3 rounded-lg font-semibold text-sm text-center hover:bg-brand-700 transition-colors">
            Login to Checkout
          </Link>
        )}

        <Link to="/products" className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-4">
          ← Continue shopping
        </Link>
      </div>
    </div>
  );
}

function CartItem({ item, onQtyChange, onRemove }) {
  const rawPrice = item.variantPrice ?? item.basePrice;
  const { finalPrice: unitPrice, hasDiscount } = getDiscountedPrice(rawPrice, item);
  const lineTotal = unitPrice * item.quantity;

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
        <p className="text-xs text-gray-500 mt-1">{item.size} · {item.color}</p>
        {hasDiscount ? (
          <p className="flex items-baseline gap-1.5 mt-1">
            <span className="text-sm font-medium text-red-600">{fmt(unitPrice)}</span>
            <span className="text-xs text-gray-400 line-through">{fmt(rawPrice)}</span>
          </p>
        ) : (
          <p className="text-sm font-medium text-gray-800 mt-1">{fmt(unitPrice)}</p>
        )}
      </div>

      {/* Qty stepper + line total + remove */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <button onClick={() => onRemove(item.variantId)} className="text-xs text-gray-400 hover:text-red-500">
          Remove
        </button>

        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => onQtyChange(item.variantId, item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 text-lg leading-none"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <button
            onClick={() => onQtyChange(item.variantId, item.quantity + 1)}
            disabled={item.quantity >= item.stockQuantity}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 text-lg leading-none"
          >
            +
          </button>
        </div>

        <p className="text-sm font-semibold text-gray-900">{fmt(lineTotal)}</p>
      </div>
    </div>
  );
}
