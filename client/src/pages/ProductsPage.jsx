import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as productsApi from "../api/products";
import * as categoriesApi from "../api/categories";
import { getErrorMessage } from "../utils/errorHelpers";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";
import Seo from "../components/Seo";
import WishlistButton from "../components/WishlistButton";
import StarRating from "../components/StarRating";
import FilterPill from "../components/FilterPill";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import { INPUT_CLASS, BUTTON_GHOST, PAGE_CLASS, H1_CLASS, CARD_CLASS } from "../utils/ui";

const formatPrice = (price) => `Rs. ${Number(price).toLocaleString()}`;

function nodeContainsSlug(node, slug) {
  if (node.slug === slug) return true;
  return node.children.some((child) => nodeContainsSlug(child, slug));
}

export default function ProductsPage() {
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [availableFilters, setAvailableFilters] = useState({ sizes: [], colors: [] });
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state — initialise category from ?category= URL param
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [search, setSearch] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

  // Load categories + available filter values once on mount
  useEffect(() => {
    let ignore = false;
    async function loadMeta() {
      try {
        const [catsData, filtersData] = await Promise.all([
          categoriesApi.getCategoryTree(),
          productsApi.getAvailableFilters(),
        ]);
        if (!ignore) {
          setCategories(catsData.tree);
          setAvailableFilters(filtersData);
        }
      } catch (err) {
        if (!ignore) setError(getErrorMessage(err));
      } finally {
        if (!ignore) setMetaLoading(false);
      }
    }
    loadMeta();
    return () => { ignore = true; };
  }, []);

  // Reload products whenever any filter or page changes
  useEffect(() => {
    let ignore = false;
    async function loadProducts() {
      setLoading(true);
      try {
        const params = { page };
        if (selectedCategory) params.category = selectedCategory;
        if (search.trim()) params.search = search.trim();
        if (selectedSize) params.size = selectedSize;
        if (selectedColor) params.color = selectedColor;
        if (minPrice !== "") params.minPrice = minPrice;
        if (maxPrice !== "") params.maxPrice = maxPrice;

        const data = await productsApi.getProducts(params);
        if (!ignore) {
          setProducts(data.products);
          setTotal(data.total);
          setPages(data.pages);
          setError("");
        }
      } catch (err) {
        if (!ignore) setError(getErrorMessage(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadProducts();
    return () => { ignore = true; };
  }, [selectedCategory, search, selectedSize, selectedColor, minPrice, maxPrice, page]);

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setSelectedCategory("");
    setSearch("");
    setSelectedSize("");
    setSelectedColor("");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }

  const hasActiveFilters = selectedCategory || search || selectedSize || selectedColor || minPrice || maxPrice;

  const activeRoot = selectedCategory
    ? categories.find((root) => nodeContainsSlug(root, selectedCategory))
    : null;

  return (
    <div className={PAGE_CLASS}>
      <Seo title="Shop Products" description="Browse shirts, pants, and shoes available for delivery across Nepal." />
      <h1 className={`${H1_CLASS} mb-5`}>Products</h1>

      {/* Category pills */}
      {!metaLoading && (
        <div className="flex flex-wrap gap-2 mb-4">
          <FilterPill
            label="All"
            active={selectedCategory === ""}
            onClick={() => changeFilter(setSelectedCategory, "")}
          />
          {categories.map((cat) => (
            <FilterPill
              key={cat.id}
              label={cat.name}
              active={selectedCategory === cat.slug}
              onClick={() => changeFilter(setSelectedCategory, cat.slug)}
            />
          ))}
        </div>
      )}

      {/* Subcategory pills — shown once a top-level category (or one of its subcategories) is selected */}
      {activeRoot && activeRoot.children.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pl-2">
          {activeRoot.children.map((child) => (
            <FilterPill
              key={child.id}
              label={child.name}
              active={selectedCategory === child.slug}
              onClick={() => changeFilter(setSelectedCategory, child.slug)}
            />
          ))}
        </div>
      )}

      {/* Search + attribute filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-5 sm:items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => changeFilter(setSearch, e.target.value)}
            className={`${INPUT_CLASS} sm:w-52`}
          />
        </div>

        {availableFilters.sizes.length > 0 && (
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
            <select
              value={selectedSize}
              onChange={(e) => changeFilter(setSelectedSize, e.target.value)}
              className={`${INPUT_CLASS} sm:w-auto`}
            >
              <option value="">All sizes</option>
              {availableFilters.sizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {availableFilters.colors.length > 0 && (
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
            <select
              value={selectedColor}
              onChange={(e) => changeFilter(setSelectedColor, e.target.value)}
              className={`${INPUT_CLASS} sm:w-auto`}
            >
              <option value="">All colors</option>
              {availableFilters.colors.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-500 mb-1">Price (Rs.)</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => changeFilter(setMinPrice, e.target.value)}
              min={0}
              className={`${INPUT_CLASS} sm:w-24`}
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => changeFilter(setMaxPrice, e.target.value)}
              min={0}
              className={`${INPUT_CLASS} sm:w-24`}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className={`${BUTTON_GHOST} text-red-600 hover:text-red-700 pb-0.5 self-start sm:self-auto`}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {/* Result count */}
      {!loading && (
        <p className="text-sm text-gray-500 mb-4">
          {total === 0 ? "No products found" : `${total} product${total !== 1 ? "s" : ""}`}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 animate-pulse">
              <div className="aspect-[4/5] bg-gray-200 rounded-t-lg" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products match your filters"
          action={hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-brand-600 hover:underline">
              Clear all filters
            </button>
          )}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      <Pagination page={page} pages={pages} onChange={setPage} />
    </div>
  );
}

function ProductCard({ product }) {
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
