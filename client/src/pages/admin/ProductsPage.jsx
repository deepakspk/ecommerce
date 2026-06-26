import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import ItemThumb from "../../components/ItemThumb";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import ClearFiltersButton from "../../components/admin/ClearFiltersButton";
import TableSkeleton from "../../components/admin/TableSkeleton";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { CARD_CLASS, INPUT_CLASS, FILTER_BAR_CLASS, FILTER_FIELD_CLASS, FILTER_FIELD_SM_CLASS } from "../../utils/ui";

const fmt = n => `Rs. ${Number(n).toLocaleString()}`;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");

  // Debounce the free-text search so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    adminApi.getCategories().then(({ categories }) => setCategories(categories)).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = { page, limit: 10, sort };
        if (search.trim()) params.search = search.trim();
        if (category) params.category = category;
        if (status) params.status = status;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        const data = await adminApi.getProducts(params);
        if (!active) return;
        setProducts(data.products);
        setTotal(data.total);
        setPages(data.pages);
        setError("");
      } catch (e) {
        if (active) setError(e.response?.data?.message || "Failed to load products");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, search, category, status, minPrice, maxPrice, sort]);

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"? This also removes all its variants.`)) return;
    setError("");
    try {
      await adminApi.deleteProduct(id);
      setProducts(ps => ps.filter(p => p._id !== id));
      setTotal(t => t - 1);
    } catch (e) {
      setError(e.response?.data?.message || "Error deleting product");
    }
  }

  const hasFilters = search || category || status || minPrice || maxPrice;

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setStatus("");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  }

  return (
    <div className="p-4 sm:p-8">
      <AdminPageHeader
        title="Products"
        loading={loading}
        subtitle={`${total} product${total !== 1 ? "s" : ""}`}
        action={
          <Link
            to="/admin/products/new"
            className="bg-white text-brand-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-50 transition-colors shadow-sm"
          >
            + New Product
          </Link>
        }
      />

      <div className={FILTER_BAR_CLASS}>
        <div className={FILTER_FIELD_CLASS}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by product name"
            className={INPUT_CLASS}
          />
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className={INPUT_CLASS}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={INPUT_CLASS}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className={FILTER_FIELD_SM_CLASS}>
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
            placeholder="Min price"
            className={INPUT_CLASS}
          />
        </div>
        <div className={FILTER_FIELD_SM_CLASS}>
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
            placeholder="Max price"
            className={INPUT_CLASS}
          />
        </div>
        <div className={FILTER_FIELD_CLASS}>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={INPUT_CLASS}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name_asc">Name: A–Z</option>
          </select>
        </div>
        <ClearFiltersButton show={hasFilters} onClick={clearFilters} />
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>
      )}

      {loading ? (
        <TableSkeleton columns={5} />
      ) : products.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No products match these filters." : "No products yet."}
          action={
            !hasFilters && (
              <Link to="/admin/products/new" className="text-brand-600 hover:underline text-sm font-medium">
                Create your first product →
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className={`${CARD_CLASS} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Base Price</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <ItemThumb
                            src={p.images?.[0]?.url}
                            alt={p.name}
                            width={100}
                            className="w-10 h-10 rounded-lg flex-shrink-0"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {p.categories?.length ? p.categories.map((c) => c.name).join(", ") : "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-700 font-medium">{fmt(p.basePrice)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                          p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/products/${p._id}/edit`}
                          className="text-brand-600 hover:underline text-xs mr-4"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={page} pages={pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
