import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import * as productsApi from "../api/products";
import * as stockAlertsApi from "../api/stockAlerts";
import { getErrorMessage } from "../utils/errorHelpers";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";
import Seo from "../components/Seo";
import WishlistButton from "../components/WishlistButton";
import StarRating from "../components/StarRating";
import ColorSwatch from "../components/ColorSwatch";
import TrustBadges from "../components/TrustBadges";
import ProductReviews from "../components/ProductReviews";
import ProductRail from "../components/ProductRail";
import RecentlyViewedRail from "../components/RecentlyViewedRail";
import { addRecentlyViewed } from "../utils/recentlyViewed";
import { PAGE_CLASS, H1_CLASS } from "../utils/ui";
import { getDiscountedPrice } from "../utils/pricing";

const SHIPPING_RETURNS_TEXT =
  "Orders are delivered across Nepal within 3–5 business days. Cash on Delivery, eSewa, and Khalti are all accepted at checkout. " +
  "Not happy with your order? Items can be returned within 7 days of delivery, as long as they're unused and in their original packaging — contact support to start a return.";

const formatPrice = (price) => `Rs. ${Number(price).toLocaleString()}`;

export default function ProductDetailPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { user } = useAuth();
  const { addItem } = useCart();
  const { isWishlisted, removeItem: removeFromWishlist } = useWishlist();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [cartFeedback, setCartFeedback] = useState(false);
  const [cartError, setCartError] = useState("");
  const [mainImageFailed, setMainImageFailed] = useState(false);
  const [failedThumbs, setFailedThumbs] = useState(() => new Set());
  const [notifyState, setNotifyState] = useState("idle"); // idle | pending | done | error
  const [notifyMessage, setNotifyMessage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const data = await productsApi.getProduct(slug);
        if (!ignore) {
          setProduct(data.product);
          setVariants(data.variants);
          setRelatedProducts(data.relatedProducts || []);
          setSelectedImage(0);
          setSelectedSize("");
          setSelectedColor("");
          setMainImageFailed(false);
          setFailedThumbs(new Set());
          setQuantity(1);
          setActiveTab("description");
          setError("");
          addRecentlyViewed(data.product.slug);
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
      <div className={PAGE_CLASS}>
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
        <Link to="/products" className="text-brand-600 hover:underline text-sm">
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
  const { finalPrice, hasDiscount } = getDiscountedPrice(displayPrice, product);
  const isOutOfStock = selectedVariant ? selectedVariant.stockQuantity === 0 : false;
  const stockQty = selectedVariant?.stockQuantity;

  function handleSizeClick(size) {
    setSelectedSize(size);
    setSelectedColor("");
    setQuantity(1);
    setCartFeedback(false);
    setCartError("");
    setNotifyState("idle");
  }

  function handleColorClick(color) {
    setSelectedColor(color);
    setQuantity(1);
    setCartFeedback(false);
    setCartError("");
    setNotifyState("idle");
  }

  async function handleNotifyMe() {
    if (!selectedVariant) return;
    setNotifyState("pending");
    try {
      const data = await stockAlertsApi.createStockAlert(selectedVariant._id);
      setNotifyMessage(data.message);
      setNotifyState("done");
    } catch (e) {
      setNotifyMessage(getErrorMessage(e));
      setNotifyState("error");
    }
  }

  async function handleAddToCart() {
    if (!selectedVariant) return;
    setCartError("");
    try {
      await addItem(selectedVariant._id, quantity, selectedVariant, product);
      if (isWishlisted(product._id)) await removeFromWishlist(product._id);
      setCartFeedback(true);
    } catch (e) {
      setCartError(e.response ? getErrorMessage(e) : e.message);
    }
  }

  const canAddToCart = hasVariants && selectedSize && selectedColor && !isOutOfStock;

  return (
    <div className={PAGE_CLASS}>
      <Seo
        title={product.name}
        description={product.description?.slice(0, 160) || undefined}
        image={product.images?.[0]?.url}
      />
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5 flex-wrap">
        <Link to="/products" className="hover:text-gray-900">Products</Link>
        {product.categories?.map((cat) => (
          <span key={cat._id} className="flex items-center gap-1.5">
            <span>/</span>
            <Link to={`/products?category=${cat.slug}`} className="hover:text-gray-900">
              {cat.name}
            </Link>
          </span>
        ))}
        <span>/</span>
        <span className="text-gray-800">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* ── Images ────────────────────────────────────────────── */}
        <div>
          <div className="group aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden mb-3 cursor-zoom-in">
            {product.images.length > 0 && !mainImageFailed ? (
              <img
                src={cloudinaryUrl(product.images[selectedImage].url, 800)}
                alt={product.images[selectedImage].altText || product.name}
                loading="eager"
                onError={() => setMainImageFailed(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-125"
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
                  onClick={() => {
                    setSelectedImage(i);
                    setMainImageFailed(false);
                  }}
                  aria-label={`View image ${i + 1} of ${product.images.length}`}
                  aria-current={i === selectedImage ? "true" : undefined}
                  className={`flex-shrink-0 w-16 h-20 rounded-lg border overflow-hidden transition-colors ${
                    i === selectedImage ? "border-brand-500" : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {failedThumbs.has(i) ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">
                      No image
                    </div>
                  ) : (
                    <img
                      src={cloudinaryUrl(img.url, 150)}
                      alt={img.altText || ""}
                      loading="lazy"
                      onError={() => setFailedThumbs((prev) => new Set(prev).add(i))}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details ───────────────────────────────────────────── */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-brand-600 mb-1">{product.categories?.map((c) => c.name).join(", ")}</p>
              <h1 className={`${H1_CLASS} mb-1`}>{product.name}</h1>
              {product.reviewCount > 0 && (
                <div className="flex items-center gap-1.5 mb-2">
                  <StarRating rating={product.averageRating} />
                  <span className="text-sm text-gray-500">
                    {product.averageRating} ({product.reviewCount} review{product.reviewCount !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
            </div>
            <WishlistButton
              product={product}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200"
              iconClassName="w-5 h-5"
            />
          </div>

          {/* Price */}
          {hasDiscount ? (
            <p className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold text-red-600">{formatPrice(finalPrice)}</span>
              <span className="text-base text-gray-400 line-through">{formatPrice(displayPrice)}</span>
            </p>
          ) : (
            <p className="text-2xl font-bold text-gray-900 mb-4">
              {formatPrice(displayPrice)}
            </p>
          )}

          {/* Description teaser */}
          {product.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">{product.description}</p>
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
                        ? "border-brand-600 bg-brand-50 text-brand-700"
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
                    className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      selectedColor === color
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-gray-300 text-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <ColorSwatch color={color} />
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

              {isOutOfStock && (
                <div className="mt-2">
                  {!user ? (
                    <Link to="/login" className="text-sm text-brand-600 hover:underline">
                      Log in to get notified when this is back in stock
                    </Link>
                  ) : notifyState === "done" ? (
                    <p className="text-sm text-green-600">{notifyMessage}</p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleNotifyMe}
                        disabled={notifyState === "pending"}
                        className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
                      >
                        {notifyState === "pending" ? "Submitting…" : "Notify me when back in stock"}
                      </button>
                      {notifyState === "error" && (
                        <p className="text-sm text-red-600 mt-1">{notifyMessage}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quantity — only meaningful once a purchasable variant is selected */}
          {canAddToCart && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Quantity</p>
              <div className="inline-flex items-center border border-gray-300 rounded-md">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(stockQty ?? q + 1, q + 1))}
                  disabled={stockQty != null && quantity >= stockQty}
                  aria-label="Increase quantity"
                  className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  +
                </button>
              </div>
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
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "bg-brand-600 text-white opacity-50 cursor-not-allowed"
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
            <Link to="/cart" className="block text-center text-sm text-brand-600 hover:underline mt-2">
              View cart →
            </Link>
          )}

          {/* SKU for reference */}
          {selectedVariant && (
            <p className="text-xs text-gray-400 mt-3 text-right">SKU: {selectedVariant.sku}</p>
          )}

          {/* <TrustBadges className="mt-6 pt-6 border-t border-gray-100" compact /> */}
        </div>
      </div>

      {/* Description / Shipping & Returns */}
      <div className="mt-10 border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("description")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "description" ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Description
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shipping")}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "shipping" ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Shipping & Returns
          </button>
        </div>
        <div className="p-5 text-sm text-gray-600 leading-relaxed">
          {activeTab === "description"
            ? product.description || "No description available for this product."
            : SHIPPING_RETURNS_TEXT}
        </div>
      </div>

      <ProductRail title="Related products" products={relatedProducts} />

      <ProductReviews productId={product._id} />

      <RecentlyViewedRail excludeSlug={product.slug} />
    </div>
  );
}
