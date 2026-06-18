import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as productsApi from "../api/products";
import { getErrorMessage } from "../utils/errorHelpers";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";
import Seo from "../components/Seo";

const formatPrice = (price) => `Rs. ${Number(price).toLocaleString()}`;

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
          productsApi.getCategories(),
          productsApi.getAvailableFilters(),
        ]);
        if (!ignore) {
          setCategories(catsData.categories);
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

  return (
    <div className="w-full px-4 sm:px-8 py-6">
      <Seo title="Shop Products" description="Browse shirts, pants, and shoes available for delivery across Nepal." />
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Products</h1>

      {/* Category pills */}
      {!metaLoading && (
        <div className="flex flex-wrap gap-2 mb-4">
          <CategoryPill
            label="All"
            active={selectedCategory === ""}
            onClick={() => changeFilter(setSelectedCategory, "")}
          />
          {categories.map((cat) => (
            <CategoryPill
              key={cat._id}
              label={cat.name}
              active={selectedCategory === cat.slug}
              onClick={() => changeFilter(setSelectedCategory, cat.slug)}
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
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-52"
          />
        </div>

        {availableFilters.sizes.length > 0 && (
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
            <select
              value={selectedSize}
              onChange={(e) => changeFilter(setSelectedSize, e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
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
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
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
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-24"
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => changeFilter(setMaxPrice, e.target.value)}
              min={0}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-24"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 hover:text-red-700 font-medium pb-0.5 self-start sm:self-auto"
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
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">No products match your filters</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:border-blue-400 transition-colors"
          >
            Previous
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 border rounded text-sm transition-colors ${
                p === page
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 hover:border-blue-400"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:border-blue-400 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
      }`}
    >
      {label}
    </button>
  );
}

function ProductCard({ product }) {
  const image = product.images?.[0];
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/5] bg-gray-100 overflow-hidden">
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
        <p className="text-xs text-blue-600 mb-0.5">{product.categoryId?.name}</p>
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.name}</h3>
        <p className="text-sm font-semibold text-gray-900">{formatPrice(product.basePrice)}</p>
      </div>
    </Link>
  );
}
