import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import * as productsApi from "../api/products";
import { getErrorMessage } from "../utils/errorHelpers";
import { useCart } from "../hooks/useCart";

const formatPrice = (price) => `Rs. ${Number(price).toLocaleString()}`;

export default function ProductDetailPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { addItem } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [cartFeedback, setCartFeedback] = useState(false);
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const data = await productsApi.getProduct(slug);
        if (!ignore) {
          setProduct(data.product);
          setVariants(data.variants);
          setSelectedImage(0);
          setSelectedSize("");
          setSelectedColor("");
          setError("");
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err.response?.status === 404 ? "Product not found." : getErrorMessage(err)
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-[4/5] bg-gray-200 rounded-lg" />
          <div className="space-y-4 pt-2">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-7 bg-gray-200 rounded w-3/4" />
            <div className="h-7 bg-gray-200 rounded w-1/4" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-red-600 mb-4">{error || "Product not found."}</p>
        <Link to="/products" className="text-blue-600 hover:underline text-sm">
          ← Back to products
        </Link>
      </div>
    );
  }

  // Derive selectable options from variants
  const sizes = [...new Set(variants.map((v) => v.size))].sort();
  const colorsForSize = selectedSize
    ? [...new Set(variants.filter((v) => v.size === selectedSize).map((v) => v.color))].sort()
    : [...new Set(variants.map((v) => v.color))].sort();

  // Find the currently selected variant (only when both size + color chosen)
  const selectedVariant =
    selectedSize && selectedColor
      ? variants.find((v) => v.size === selectedSize && v.color === selectedColor) || null
      : null;

  const hasVariants = variants.length > 0;
  const displayPrice = selectedVariant?.price ?? product.basePrice;
  const isOutOfStock = selectedVariant ? selectedVariant.stockQuantity === 0 : false;
  const stockQty = selectedVariant?.stockQuantity;

  function handleSizeClick(size) {
    setSelectedSize(size);
    setSelectedColor("");
    setCartFeedback(false);
    setCartError("");
  }

  function handleColorClick(color) {
    setSelectedColor(color);
    setCartFeedback(false);
    setCartError("");
  }

  async function handleAddToCart() {
    if (!selectedVariant) return;
    setCartError("");
    try {
      await addItem(selectedVariant._id, 1, selectedVariant, product);
      setCartFeedback(true);
      setTimeout(() => setCartFeedback(false), 3000);
    } catch (e) {
      setCartError(e.response ? getErrorMessage(e) : e.message);
    }
  }

  const canAddToCart = hasVariants && selectedSize && selectedColor && !isOutOfStock;

  return (
    <div className="w-full px-8 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5 flex-wrap">
        <Link to="/products" className="hover:text-gray-900">Products</Link>
        <span>/</span>
        <Link
          to={`/products?category=${product.categoryId?.slug}`}
          className="hover:text-gray-900"
        >
          {product.categoryId?.name}
        </Link>
        <span>/</span>
        <span className="text-gray-800">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* ── Images ────────────────────────────────────────────── */}
        <div>
          <div className="aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden mb-3">
            {product.images.length > 0 ? (
              <img
                src={product.images[selectedImage].url}
                alt={product.images[selectedImage].altText || product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                No image
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`flex-shrink-0 w-16 h-20 rounded-lg border overflow-hidden transition-colors ${
                    i === selectedImage ? "border-blue-500" : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <img src={img.url} alt={img.altText || ""} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details ───────────────────────────────────────────── */}
        <div>
          <p className="text-sm text-blue-600 mb-1">{product.categoryId?.name}</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>

          {/* Price */}
          <p className="text-2xl font-semibold text-gray-900 mb-4">
            {formatPrice(displayPrice)}
          </p>

          {/* Description */}
          {product.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>
          )}

          {/* Size selection */}
          {sizes.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Size
                {selectedSize && (
                  <span className="font-normal text-gray-500 ml-1">— {selectedSize}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSizeClick(size)}
                    className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700 hover:border-gray-500"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color selection */}
          {colorsForSize.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Color
                {selectedColor && (
                  <span className="font-normal text-gray-500 ml-1">— {selectedColor}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {colorsForSize.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorClick(color)}
                    className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                      selectedColor === color
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700 hover:border-gray-500"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock indicator — only show once a variant is fully selected */}
          {selectedVariant && (
            <div className="mb-4">
              {isOutOfStock ? (
                <p className="text-sm font-medium text-red-600">Out of stock</p>
              ) : stockQty <= 5 ? (
                <p className="text-sm text-amber-600">Only {stockQty} left in stock — order soon</p>
              ) : (
                <p className="text-sm text-green-600">In stock</p>
              )}
            </div>
          )}

          {/* Cart error */}
          {cartError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              {cartError}
            </p>
          )}

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart || cartFeedback}
            className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
              cartFeedback
                ? "bg-green-600 text-white"
                : !hasVariants || (isOutOfStock && selectedVariant)
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : canAddToCart
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-blue-600 text-white opacity-50 cursor-not-allowed"
            }`}
          >
            {cartFeedback
              ? "Added to cart!"
              : !hasVariants
              ? "No options available"
              : isOutOfStock && selectedVariant
              ? "Out of stock"
              : !selectedSize
              ? "Select a size to continue"
              : !selectedColor
              ? "Select a color to continue"
              : "Add to Cart"}
          </button>

          {cartFeedback && (
            <Link to="/cart" className="block text-center text-sm text-blue-600 hover:underline mt-2">
              View cart →
            </Link>
          )}

          {/* SKU for reference */}
          {selectedVariant && (
            <p className="text-xs text-gray-400 mt-3 text-right">SKU: {selectedVariant.sku}</p>
          )}
        </div>
      </div>
    </div>
  );
}
