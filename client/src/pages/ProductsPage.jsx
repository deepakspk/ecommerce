import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import * as productsApi from "../api/products";
import { useCategories } from "../hooks/useCategories";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { getErrorMessage } from "../utils/errorHelpers";
import Seo from "../components/Seo";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import ProductCard from "../components/ProductCard";
import RecentlyViewedRail from "../components/RecentlyViewedRail";
import BannerCarousel from "../components/BannerCarousel";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";
import { INPUT_CLASS, BUTTON_GHOST, CARD_CLASS, PAGE_CLASS, H1_CLASS, SECTION_HEADING_CLASS } from "../utils/ui";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

function flattenCategories(nodes, depth = 0) {
  const out = [];
  for (const node of nodes) {
    out.push({ slug: node.slug, name: node.name, depth });
    out.push(...flattenCategories(node.children, depth + 1));
  }
  return out;
}

function pillClass(active) {
  return `px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
    active ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-600 hover:border-gray-500"
  }`;
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const gridRef = useRef(null);

  const { categories, loading: categoriesLoading } = useCategories();
  const [availableFilters, setAvailableFilters] = useState({ sizes: [], colors: [] });
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
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
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const minPrice = useDebouncedValue(minPriceInput, 400);
  const maxPrice = useDebouncedValue(maxPriceInput, 400);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

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

  // Load available filter values (sizes/colors/price range) once on mount.
  // Categories come from the shared CategoriesProvider instead of a local fetch.
  useEffect(() => {
    let ignore = false;
    async function loadFilters() {
      try {
        const filtersData = await productsApi.getAvailableFilters();
        if (!ignore) setAvailableFilters(filtersData);
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
        const params = { page, sort };
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
  }, [selectedCategory, search, selectedSize, selectedColor, minPrice, maxPrice, sort, page]);

  // Debounced price changes should reset to page 1, same as every other filter.
  useEffect(() => {
    setPage(1);
  }, [minPrice, maxPrice]);

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
    setSelectedSize("");
    setSelectedColor("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setPage(1);
  }

  const hasActiveFilters =
    selectedCategory || search || selectedSize || selectedColor || minPriceInput || maxPriceInput;

  const chips = [];
  if (selectedCategoryObj) chips.push({ key: "category", label: selectedCategoryObj.name, onRemove: () => selectCategory("") });
  if (search) chips.push({ key: "search", label: `"${search}"`, onRemove: () => updateSearch("") });
  if (selectedSize) chips.push({ key: "size", label: `Size: ${selectedSize}`, onRemove: () => changeFilter(setSelectedSize, "") });
  if (selectedColor) chips.push({ key: "color", label: `Color: ${selectedColor}`, onRemove: () => changeFilter(setSelectedColor, "") });
  if (minPriceInput || maxPriceInput) {
    chips.push({
      key: "price",
      label: `Rs. ${minPriceInput || 0}–${maxPriceInput || "∞"}`,
      onRemove: () => { setMinPriceInput(""); setMaxPriceInput(""); },
    });
  }

  const showHero = isHome && !hasActiveFilters;
  const pageHeading = selectedCategoryObj
    ? selectedCategoryObj.name
    : search
    ? `Results for "${search}"`
    : "All Products";

  return (
    <div className={PAGE_CLASS}>
      <Seo title="Shop Products" description="Browse shirts, pants, and shoes available for delivery across Nepal." />

      {showHero && (
        <div className="mb-8 space-y-8">
          <BannerCarousel />

          <div>
            {/* <h2 className={`${SECTION_HEADING_CLASS} mb-4`}>Shop by Category</h2> */}

            {metaLoading && (
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 sm:gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-200" />
                    <div className="px-3 py-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!metaLoading && categories.length > 0 && (
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
            )}
          </div>
        </div>
      )}

      {!isHome && (
        <div className="mb-6">
          <nav className="text-sm text-gray-500 mb-2 flex items-center gap-1.5">
            <Link to="/" className="hover:text-gray-900">Home</Link>
            <span>/</span>
            <span className="text-gray-800">{pageHeading}</span>
          </nav>
          <h1 className={H1_CLASS}>{pageHeading}</h1>
        </div>
      )}

      {!isHome && chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 text-xs font-medium pl-3 pr-2 py-1.5 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
            >
              {chip.label}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
          <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Clear all
          </button>
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => selectCategory(e.target.value)}
                  className={`${INPUT_CLASS} w-full`}
                >
                  <option value="">All categories</option>
                  {flatCategories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {"  ".repeat(c.depth)}{c.depth > 0 ? "– " : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Price (Rs.)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    min={0}
                    className={`${INPUT_CLASS} w-full`}
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    min={0}
                    className={`${INPUT_CLASS} w-full`}
                  />
                </div>
              </div>

              {availableFilters.sizes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => changeFilter(setSelectedSize, "")} className={pillClass(selectedSize === "")}>
                      All
                    </button>
                    {availableFilters.sizes.map((s) => (
                      <button key={s} type="button" onClick={() => changeFilter(setSelectedSize, s)} className={pillClass(selectedSize === s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableFilters.colors.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => changeFilter(setSelectedColor, "")}
                      title="All colors"
                      aria-label="All colors"
                      aria-pressed={selectedColor === ""}
                      className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-[9px] text-gray-400 transition-colors ${
                        selectedColor === "" ? "border-brand-600 ring-2 ring-brand-100" : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      All
                    </button>
                    {availableFilters.colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => changeFilter(setSelectedColor, c)}
                        title={c}
                        aria-label={c}
                        aria-pressed={selectedColor === c}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full border-2 flex-shrink-0 transition-colors ${
                          selectedColor === c ? "border-brand-600 ring-2 ring-brand-100" : "border-gray-300 hover:border-gray-400"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        <div ref={gridRef} className={!isHome ? "flex-1 min-w-0" : undefined}>
          {/* {isHome && <h2 className={`${SECTION_HEADING_CLASS} mb-4`}>All Products</h2>} */}

          {!isHome && !loading && !error && (
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm text-gray-500">
                {/* {total > 0 ? `Showing ${products.length} of ${total} product${total === 1 ? "" : "s"}` : ""} */}
              </p>
              <select
                value={sort}
                onChange={(e) => changeSort(e.target.value)}
                className="border border-gray-300 rounded-md px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

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
                <ProductCard key={product._id} product={product} hideCategorySlug={selectedCategory} />
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
