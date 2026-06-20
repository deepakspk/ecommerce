import { useState, useEffect } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import * as productsApi from "../api/products";
import * as categoriesApi from "../api/categories";
import { getErrorMessage } from "../utils/errorHelpers";
import Seo from "../components/Seo";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import ProductCard from "../components/ProductCard";
import RecentlyViewedRail from "../components/RecentlyViewedRail";
import BannerCarousel from "../components/BannerCarousel";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";
import { INPUT_CLASS, BUTTON_GHOST, CARD_CLASS, PAGE_CLASS } from "../utils/ui";

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const [categories, setCategories] = useState([]);
  const [availableFilters, setAvailableFilters] = useState({ sizes: [], colors: [] });
  const [products, setProducts] = useState([]);
  const [pages, setPages] = useState(0);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Category filter is derived straight from the ?category= URL param (not local
  // state) so that external navigations — CategoryNav, the homepage category tiles,
  // browser back/forward — always take effect immediately, with no separate sync step.
  const selectedCategory = searchParams.get("category") || "";
  // Search is also derived from the URL (?search=) so the Navbar's search bar
  // and this page stay in sync — same reasoning as selectCategory below.
  const search = searchParams.get("search") || "";
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

  function selectCategory(slug) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (slug) next.set("category", slug);
      else next.delete("category");
      return next;
    });
    setPage(1);
  }

  // Uses { replace: true } so live typing doesn't push a new history entry per keystroke.
  function updateSearch(value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set("search", value);
      else next.delete("search");
      return next;
    }, { replace: true });
    setPage(1);
  }

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
    selectCategory("");
    updateSearch("");
    setSelectedSize("");
    setSelectedColor("");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }

  const hasActiveFilters = selectedCategory || search || selectedSize || selectedColor || minPrice || maxPrice;

  const showHero = isHome && !hasActiveFilters;

  return (
    <div className={PAGE_CLASS}>
      <Seo title="Shop Products" description="Browse shirts, pants, and shoes available for delivery across Nepal." />

      {showHero && (
        <div className="mb-8 space-y-8">
          <BannerCarousel />

          {!metaLoading && categories.length > 0 && (
            <div>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 sm:gap-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/products?category=${cat.slug}`}
                    className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-gray-100 overflow-hidden p-6">
                      {cat.image ? (
                        <img
                          src={cloudinaryUrl(cat.image, 240)}
                          alt={cat.name}
                          loading="lazy"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-gray-300">
                          {cat.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <p className="px-3 py-2 text-sm font-medium text-gray-700 group-hover:text-brand-600 truncate">
                      {cat.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={!isHome ? "flex flex-col sm:flex-row gap-6" : undefined}>
        {/* Filter sidebar — homepage relies on the Navbar search bar and category
            tiles instead; this only shows on /products */}
        {!isHome && (
          <aside className="w-full sm:w-56 flex-shrink-0">
            <div className={`${CARD_CLASS} p-4 space-y-5 sm:sticky sm:top-20`}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className={`${BUTTON_GHOST} text-red-600 hover:text-red-700 text-xs`}>
                    Clear
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Price (Rs.)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => changeFilter(setMinPrice, e.target.value)}
                    min={0}
                    className={`${INPUT_CLASS} w-full`}
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => changeFilter(setMaxPrice, e.target.value)}
                    min={0}
                    className={`${INPUT_CLASS} w-full`}
                  />
                </div>
              </div>

              {availableFilters.sizes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
                  <select
                    value={selectedSize}
                    onChange={(e) => changeFilter(setSelectedSize, e.target.value)}
                    className={`${INPUT_CLASS} w-full`}
                  >
                    <option value="">All sizes</option>
                    {availableFilters.sizes.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {availableFilters.colors.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                  <select
                    value={selectedColor}
                    onChange={(e) => changeFilter(setSelectedColor, e.target.value)}
                    className={`${INPUT_CLASS} w-full`}
                  >
                    <option value="">All colors</option>
                    {availableFilters.colors.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </aside>
        )}

        <div className={!isHome ? "flex-1 min-w-0" : undefined}>
          {/* Error */}
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          {/* Grid */}
          {loading ? (
            <div className={`grid ${isHome ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} gap-4`}>
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
            <div className={`grid ${isHome ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} gap-4`}>
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          <Pagination page={page} pages={pages} onChange={setPage} />
        </div>
      </div>

      <RecentlyViewedRail />
    </div>
  );
}
