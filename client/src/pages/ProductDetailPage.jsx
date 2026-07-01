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
import ProductReviews from "../components/ProductReviews";
import ProductQuestions from "../components/ProductQuestions";
import ProductRail from "../components/ProductRail";
import RecentlyViewedRail from "../components/RecentlyViewedRail";
import { addRecentlyViewed } from "../utils/recentlyViewed";
import { PAGE_CLASS, H1_CLASS } from "../utils/ui";
import { getDiscountedPrice } from "../utils/pricing";

const SHIPPING_RETURNS_TEXT =
  "Orders are delivered across Nepal within 3–5 business days. Cash on Delivery, eSewa, and Khalti are all accepted at checkout. " +
  "Not happy with your order? Items can be returned within 7 days of delivery, as long as they're unused and in their original packaging — contact support to start a return.";

const formatPrice = (price) => `Rs. ${Number(price).toLocaleString()}`;

const TABS = [
  { id: "description", label: "Description" },
  { id: "shipping", label: "Shipping & Returns" },
  { id: "reviews", label: "Reviews" },
  { id: "questions", label: "Questions" },
];

function ShareButton({ icon, label, onClick, colorClass }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-80 ${colorClass}`}
    >
      {icon}
    </button>
  );
}

function ShareButtons({ product }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;
  const text = encodeURIComponent(product.name);
  const encodedUrl = encodeURIComponent(url);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const shares = [
    {
      label: "Share on Facebook",
      colorClass: "bg-[#1877F2]",
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank", "width=600,height=400"),
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    {
      label: "Share on X (Twitter)",
      colorClass: "bg-[#000000]",
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`, "_blank", "width=600,height=400"),
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      label: "Share on WhatsApp",
      colorClass: "bg-[#25D366]",
      onClick: () => window.open(`https://wa.me/?text=${text}%20${encodedUrl}`, "_blank"),
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
    },
    {
      label: "Share on Telegram",
      colorClass: "bg-[#229ED9]",
      onClick: () => window.open(`https://t.me/share/url?url=${encodedUrl}&text=${text}`, "_blank"),
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {shares.map((s) => (
        <ShareButton key={s.label} {...s} />
      ))}
      <button
        type="button"
        onClick={copyLink}
        title="Copy link"
        className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-300 text-gray-600 hover:border-gray-500 transition-colors"
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )}
      </button>
    </div>
  );
}

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
  const [notifyState, setNotifyState] = useState("idle");
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
          <div className="aspect-square bg-gray-200 rounded-2xl" />
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

  const sizes = [...new Set(variants.map((v) => v.size))].sort();
  const colorsForSize = selectedSize
    ? [...new Set(variants.filter((v) => v.size === selectedSize).map((v) => v.color))].sort()
    : [...new Set(variants.map((v) => v.color))].sort();

  const selectedVariant =
    selectedSize && selectedColor
      ? variants.find((v) => v.size === selectedSize && v.color === selectedColor) || null
      : null;

  const hasVariants = variants.length > 0;
  const displayPrice = selectedVariant?.price ?? product.basePrice;
  const { finalPrice, hasDiscount, discountPercent } = getDiscountedPrice(displayPrice, product);
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

  const tabsWithCount = TABS.map((t) => {
    if (t.id === "reviews" && product.reviewCount > 0) return { ...t, label: `Reviews (${product.reviewCount})` };
    return t;
  });

  return (
    <div className={PAGE_CLASS}>
      <Seo
        title={product.name}
        description={product.description?.slice(0, 160) || undefined}
        image={product.images?.[0]?.url}
      />

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5 flex-wrap">
        <Link to="/products" className="hover:text-gray-900 transition-colors">Products</Link>
        {product.categories?.map((cat) => (
          <span key={cat._id} className="flex items-center gap-1.5">
            <span>/</span>
            <Link to={`/products?category=${cat.slug}`} className="hover:text-gray-900 transition-colors">
              {cat.name}
            </Link>
          </span>
        ))}
        <span>/</span>
        <span className="text-gray-800">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* ── Images ─────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6">
          {/* Main image — square */}
          <div className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {product.images.length > 0 && !mainImageFailed ? (
              <img
                src={cloudinaryUrl(product.images[selectedImage].url, 700)}
                alt={product.images[selectedImage].altText || product.name}
                loading="eager"
                onError={() => setMainImageFailed(true)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                No image
              </div>
            )}
            {/* Discount badge on image */}
            {hasDiscount && discountPercent && (
              <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                -{Math.round(discountPercent)}%
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedImage(i); setMainImageFailed(false); }}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === selectedImage ? "true" : undefined}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${
                    i === selectedImage
                      ? "border-brand-500 shadow-md scale-105"
                      : "border-transparent hover:border-gray-300 opacity-70 hover:opacity-100"
                  }`}
                >
                  {failedThumbs.has(i) ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px] bg-gray-100">
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

          {/* Social Share */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Share</span>
            <ShareButtons product={product} />
          </div>
        </div>

        {/* ── Details ────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Header: category, title, rating, wishlist */}
          <div>
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">
              {product.categories?.map((c) => c.name).join(", ")}
            </p>
            <div className="flex items-start justify-between gap-3">
              <h1 className={`${H1_CLASS} leading-snug`}>{product.name}</h1>
              <WishlistButton
                product={product}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                iconClassName="w-5 h-5"
              />
            </div>

            {product.reviewCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("reviews")}
                className="inline-flex items-center gap-1.5 mt-1.5 hover:opacity-80 transition-opacity"
              >
                <StarRating rating={product.averageRating} />
                <span className="text-sm text-gray-500 hover:text-brand-600 transition-colors">
                  {product.averageRating} ({product.reviewCount} review{product.reviewCount !== 1 ? "s" : ""})
                </span>
              </button>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 flex-wrap">
            {hasDiscount ? (
              <>
                <span className="text-3xl font-bold text-red-600">{formatPrice(finalPrice)}</span>
                <span className="text-lg text-gray-400 line-through">{formatPrice(displayPrice)}</span>
                {discountPercent && (
                  <span className="bg-red-100 text-red-600 text-sm font-bold px-2.5 py-0.5 rounded-full">
                    {Math.round(discountPercent)}% OFF
                  </span>
                )}
              </>
            ) : (
              <span className="text-3xl font-bold text-gray-900">{formatPrice(displayPrice)}</span>
            )}
          </div>

          {/* Description teaser */}
          {product.description && (
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">{product.description}</p>
          )}

          <div className="border-t border-gray-100" />

          {/* Size selection */}
          {sizes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Size
                {selectedSize && <span className="font-normal text-gray-500 ml-1">— {selectedSize}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSizeClick(size)}
                    className={`px-4 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                      selectedSize === size
                        ? "border-brand-600 bg-brand-50 text-brand-700 shadow-sm"
                        : "border-gray-200 text-gray-700 hover:border-gray-400"
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
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Color
                {selectedColor && <span className="font-normal text-gray-500 ml-1">— {selectedColor}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {colorsForSize.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorClick(color)}
                    className={`flex items-center gap-2 px-3 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                      selectedColor === color
                        ? "border-brand-600 bg-brand-50 text-brand-700 shadow-sm"
                        : "border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <ColorSwatch color={color} />
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock indicator */}
          {selectedVariant && (
            <div>
              {isOutOfStock ? (
                <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-sm font-medium px-3 py-1.5 rounded-full border border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Out of stock
                </div>
              ) : stockQty <= 5 ? (
                <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-sm font-medium px-3 py-1.5 rounded-full border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Only {stockQty} left — order soon
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-sm font-medium px-3 py-1.5 rounded-full border border-green-200">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  {stockQty} in stock
                </div>
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

          {/* Quantity + Add to Cart */}
          <div className="space-y-3">
            {canAddToCart && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Quantity</p>
                <div className="inline-flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent text-lg font-medium transition-colors"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-base font-semibold text-gray-800">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(stockQty ?? q + 1, q + 1))}
                    disabled={stockQty != null && quantity >= stockQty}
                    aria-label="Increase quantity"
                    className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent text-lg font-medium transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {cartError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {cartError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!canAddToCart || cartFeedback}
                className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                  cartFeedback
                    ? "bg-green-600 text-white shadow-green-200"
                    : !hasVariants || (isOutOfStock && selectedVariant)
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                    : canAddToCart
                    ? "bg-brand-600 text-white hover:bg-brand-700 hover:shadow-md"
                    : "bg-brand-600 text-white opacity-50 cursor-not-allowed"
                }`}
              >
                {cartFeedback ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Added to Cart!
                  </span>
                ) : !hasVariants
                ? "No options available"
                : isOutOfStock && selectedVariant
                ? "Out of Stock"
                : !selectedSize
                ? "Select a size to continue"
                : !selectedColor
                ? "Select a color to continue"
                : "Add to Cart"}
              </button>
            </div>

            {cartFeedback && (
              <Link to="/cart" className="block text-center text-sm text-brand-600 hover:underline font-medium">
                View cart →
              </Link>
            )}
          </div>

          {selectedVariant && (
            <p className="text-xs text-gray-400 text-right">SKU: {selectedVariant.sku}</p>
          )}
        </div>
      </div>

      {/* ── Tabs: Description / Shipping / Reviews / Questions ───── */}
      <div className="mt-14 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50">
          {tabsWithCount.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-brand-600 text-brand-700 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "description" && (
            <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none">
              {product.description || "No description available for this product."}
            </div>
          )}
          {activeTab === "shipping" && (
            <p className="text-sm text-gray-600 leading-relaxed">{SHIPPING_RETURNS_TEXT}</p>
          )}
          {activeTab === "reviews" && (
            <ProductReviews productId={product._id} embedded />
          )}
          {activeTab === "questions" && (
            <ProductQuestions productId={product._id} />
          )}
        </div>
      </div>

      <ProductRail title="Related products" products={relatedProducts} />
      <RecentlyViewedRail excludeSlug={product.slug} />
    </div>
  );
}
