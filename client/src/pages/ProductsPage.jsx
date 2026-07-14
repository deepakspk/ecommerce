import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import * as productsApi from "../api/products";
import { getActiveFeatureTypes } from "../api/featureTypes";
import { useCategories } from "../hooks/useCategories";
import { getErrorMessage } from "../utils/errorHelpers";
import Seo from "../components/Seo";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import ProductCard from "../components/ProductCard";
import StarRating from "../components/StarRating";
import RecentlyViewedRail from "../components/RecentlyViewedRail";
import BannerCarousel from "../components/BannerCarousel";
import HomeCampaigns from "../components/HomeCampaigns";
import HomeShowcase from "../components/HomeShowcase";
import CategoryRail from "../components/CategoryRail";
import { INPUT_CLASS, PAGE_CLASS } from "../utils/ui";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

const SECTION_LABEL_CLASS = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2";

const SUBCATEGORY_LIMIT = 8;

function flattenCategories(nodes, depth = 0, parentSlug = null) {
  const out = [];
  for (const node of nodes) {
    out.push({
      slug: node.slug,
      name: node.name,
      depth,
      parentSlug,
      hasChildren: (node.children?.length ?? 0) > 0,
    });
    out.push(...flattenCategories(node.children, depth + 1, node.slug));
  }
  return out;
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const gridRef = useRef(null);

  const { categories, loading: categoriesLoading } = useCategories();
  const [featureTypes, setFeatureTypes] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Category filter is derived straight from the ?category= URL param (not local
  // state) so that external navigations — CategoryNav, the homepage category tiles,
  // browser back/forward — always take effect immediately, with no separate sync step.
  const selectedCategory = searchParams.get("category") || "";
  // Search is also derived from the URL (?search=) so the Navbar's search bar
  // and this page stay in sync — same reasoning as selectCategory below.
  const search = searchParams.get("search") || "";
  // Feature type is URL-derived too, so the homepage rails' "View All" links
  // (/products?featureType=best-seller) land on the filtered list directly.
  const selectedFeatureType = searchParams.get("featureType") || "";
  const [selectedMinRating, setSelectedMinRating] = useState(0);
  // Price inputs are draft state; they only filter once the GO button (or
  // Enter) commits them into minPrice/maxPrice — matching marketplace UX.
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [showAllSubCategories, setShowAllSubCategories] = useState(false);

  const metaLoading = categoriesLoading || filtersLoading;
  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const selectedCategoryObj = flatCategories.find((c) => c.slug === selectedCategory);

  function scrollToGrid() {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectCategory(slug) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (slug) next.set("category", slug);
      else next.delete("category");
      return next;
    });
    setPage(1);
    scrollToGrid();
  }

  function selectFeatureType(slug) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (slug) next.set("featureType", slug);
      else next.delete("featureType");
      return next;
    });
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

  // Load active feature types once on mount, for the Feature filter dropdown.
  // Categories come from the shared CategoriesProvider instead of a local fetch.
  useEffect(() => {
    let ignore = false;
    async function loadFilters() {
      try {
        const { featureTypes: data } = await getActiveFeatureTypes();
        if (!ignore) setFeatureTypes(data);
      } catch (err) {
        if (!ignore) setError(getErrorMessage(err));
      } finally {
        if (!ignore) setFiltersLoading(false);
      }
    }
    loadFilters();
    return () => { ignore = true; };
  }, []);

  // Reload products whenever any filter, sort, or page changes
  useEffect(() => {
    let ignore = false;
    async function loadProducts() {
      setLoading(true);
      try {
        // Home keeps the grid short (campaign sections live above it); the
        // dedicated /products browse page shows the server default of 20.
        const params = { page, sort, limit: isHome ? 10 : 20 };
        if (selectedCategory) params.category = selectedCategory;
        if (search.trim()) params.search = search.trim();
        if (selectedFeatureType) params.featureType = selectedFeatureType;
        if (selectedMinRating > 0) params.minRating = selectedMinRating;
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
  }, [isHome, selectedCategory, search, selectedFeatureType, selectedMinRating, minPrice, maxPrice, sort, page]);

  function applyPriceRange(e) {
    e?.preventDefault();
    setMinPrice(minPriceInput);
    setMaxPrice(maxPriceInput);
    setPage(1);
    scrollToGrid();
  }

  function clearPriceRange() {
    setMinPriceInput("");
    setMaxPriceInput("");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
    scrollToGrid();
  }

  function changeSort(value) {
    setSort(value);
    setPage(1);
    scrollToGrid();
  }

  function goToPage(p) {
    setPage(p);
    scrollToGrid();
  }

  function clearFilters() {
    selectCategory("");
    updateSearch("");
    selectFeatureType("");
    setSelectedMinRating(0);
    clearPriceRange();
    setPage(1);
  }

  const hasActiveFilters =
    selectedCategory || search || selectedFeatureType || selectedMinRating || minPrice || maxPrice;

  const showHero = isHome && !hasActiveFilters;
  const pageHeading = selectedCategoryObj
    ? selectedCategoryObj.name
    : search
    ? `Results for "${search}"`
    : "All Products";

  // Breadcrumb trail: the selected category plus all its ancestors.
  const breadcrumbTrail = [];
  for (let node = selectedCategoryObj; node; node = flatCategories.find((c) => c.slug === node.parentSlug)) {
    breadcrumbTrail.unshift(node);
  }

  // Sidebar checkbox list scope: top-level categories by default; the selected
  // category's children once one is picked (its siblings if it has none, so
  // the shopper can still switch without going back up).
  let subCategoryScope = flatCategories.filter((c) => c.depth === 0);
  let subCategoryLabel = "Categories";
  if (selectedCategoryObj) {
    subCategoryLabel = "Sub-Categories";
    subCategoryScope = flatCategories.filter(
      (c) => c.parentSlug === (selectedCategoryObj.hasChildren ? selectedCategoryObj.slug : selectedCategoryObj.parentSlug)
    );
  }
  const visibleSubCategories = showAllSubCategories ? subCategoryScope : subCategoryScope.slice(0, SUBCATEGORY_LIMIT);

  return (
    <div className={PAGE_CLASS}>
      <Seo title="Shop Products" description="Browse shirts, pants, and shoes available for delivery across Nepal." />

      {showHero && (
        <div className="mb-8 space-y-8">
          <BannerCarousel />

          <div>
            {/* <h2 className={`${SECTION_HEADING_CLASS} mb-4`}>Shop by Category</h2> */}
            <CategoryRail categories={categories} loading={metaLoading} />
          </div>

          {/* Running campaigns (Flash Sale etc.) with countdown + product rails */}
          <HomeCampaigns />

          {/* Feature-type rails (Best Seller, New Arrival, …) interleaved with promotion banners */}
          <HomeShowcase />
        </div>
      )}

      <div className={!isHome ? "flex flex-col sm:flex-row gap-6" : undefined}>
        {/* Filter sidebar — homepage relies on the Navbar search bar and category
            tiles instead; this only shows on /products */}
        {!isHome && (
          <aside className="w-full sm:w-[16.8rem] flex-shrink-0">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-5 sm:sticky sm:top-20">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                  </svg>
                  Filters
                </h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-red-600 border border-red-200 rounded-full px-2.5 py-1 hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div>
                <label className={SECTION_LABEL_CLASS}>Sort By</label>
                <select
                  value={sort}
                  onChange={(e) => changeSort(e.target.value)}
                  className={`${INPUT_CLASS} w-full`}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <form onSubmit={applyPriceRange} className="border border-gray-200 rounded-xl shadow-sm p-3">
                <p className="text-sm font-semibold text-gray-900 mb-2.5">Price Range</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs text-gray-500 mb-1">Min Price</label>
                    <input
                      type="number"
                      value={minPriceInput}
                      onChange={(e) => setMinPriceInput(e.target.value)}
                      min={0}
                      className={`${INPUT_CLASS} !rounded-lg`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs text-gray-500 mb-1">Max Price</label>
                    <input
                      type="number"
                      value={maxPriceInput}
                      onChange={(e) => setMaxPriceInput(e.target.value)}
                      min={0}
                      className={`${INPUT_CLASS} !rounded-lg`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex-shrink-0 bg-brand-600 text-white text-xs font-bold rounded-lg px-3 py-2.5 ring-2 ring-brand-800/60 hover:bg-brand-700 transition-colors"
                  >
                    GO
                  </button>
                </div>
              </form>

              <div className="pt-4 border-t-2 border-brand-600/70">
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                  <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5v6a3 3 0 0 0 3 3h13m0 0-4-4m4 4-4 4" />
                  </svg>
                  {subCategoryLabel}
                </p>
                <div className="space-y-2.5">
                  {visibleSubCategories.map((c) => (
                    <label key={c.slug} className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedCategory === c.slug}
                        onChange={(e) => selectCategory(e.target.checked ? c.slug : c.parentSlug || "")}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-brand-600 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-brand-600 leading-snug">{c.name}</span>
                    </label>
                  ))}
                  {subCategoryScope.length === 0 && (
                    <p className="text-xs text-gray-400">No sub-categories</p>
                  )}
                </div>
                {subCategoryScope.length > SUBCATEGORY_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setShowAllSubCategories((v) => !v)}
                    className="mt-3 pt-3 border-t border-gray-100 w-full text-center text-xs font-bold uppercase tracking-wide text-brand-600 hover:text-brand-700"
                  >
                    {showAllSubCategories ? "Show Less" : "Show More"}
                  </button>
                )}
              </div>

              {featureTypes.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <label className={SECTION_LABEL_CLASS}>Feature</label>
                  <select
                    value={selectedFeatureType}
                    onChange={(e) => changeFilter(selectFeatureType, e.target.value)}
                    className={`${INPUT_CLASS} w-full`}
                  >
                    <option value="">All features</option>
                    {featureTypes.map((ft) => (
                      <option key={ft.slug} value={ft.slug}>{ft.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <label className={SECTION_LABEL_CLASS}>Rating</label>
                <div className="flex items-center gap-2">
                  <StarRating
                    rating={selectedMinRating}
                    size="md"
                    interactive
                    onChange={(n) => changeFilter(setSelectedMinRating, n === selectedMinRating ? 0 : n)}
                  />
                  <span className="text-xs text-gray-500">
                    {selectedMinRating > 0 ? `${selectedMinRating} stars & up` : "Any rating"}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        )}

        <div ref={gridRef} className={!isHome ? "flex-1 min-w-0" : undefined}>
          {/* {isHome && <h2 className={`${SECTION_HEADING_CLASS} mb-4`}>All Products</h2>} */}

          {/* Breadcrumb bar — card above the grid, marketplace style */}
          {!isHome && (
            <div className="mb-5">
              <nav
                aria-label="Breadcrumb"
                className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-3 flex items-center gap-2 text-sm overflow-x-auto whitespace-nowrap"
              >
                <Link to="/" className="text-brand-600 hover:underline flex-shrink-0">Home</Link>
                {breadcrumbTrail.length > 0 ? (
                  breadcrumbTrail.map((crumb, i) => (
                    <span key={crumb.slug} className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-300">/</span>
                      {i < breadcrumbTrail.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => selectCategory(crumb.slug)}
                          className="text-brand-600 hover:underline"
                        >
                          {crumb.name}
                        </button>
                      ) : (
                        <span className="text-gray-700 font-medium truncate">{crumb.name}</span>
                      )}
                    </span>
                  ))
                ) : (
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-700 font-medium truncate">{pageHeading}</span>
                  </span>
                )}
              </nav>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          {/* Grid */}
          {loading ? (
            <div className={`grid ${isHome ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} gap-4`}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded-t-2xl" />
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
              message={hasActiveFilters ? "Try removing a filter or searching for something else." : undefined}
              action={
                hasActiveFilters ? (
                  <button onClick={clearFilters} className="text-sm text-brand-600 hover:underline font-medium">
                    Clear all filters
                  </button>
                ) : (
                  <Link to="/products" className="text-sm text-brand-600 hover:underline font-medium">
                    Browse all products
                  </Link>
                )
              }
            />
          ) : (
            <div className={`grid ${isHome ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"} gap-4`}>
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          <Pagination page={page} pages={pages} onChange={goToPage} />
        </div>
      </div>

      <RecentlyViewedRail />
    </div>
  );
}
