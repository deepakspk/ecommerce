import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import ItemThumb from "../../components/ItemThumb";
import EmptyState from "../../components/EmptyState";
import { H1_CLASS, CARD_CLASS } from "../../utils/ui";

const fmt = n => `Rs. ${Number(n).toLocaleString()}`;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await adminApi.getProducts();
      setProducts(data.products);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"? This also removes all its variants.`)) return;
    setError("");
    try {
      await adminApi.deleteProduct(id);
      setProducts(ps => ps.filter(p => p._id !== id));
    } catch (e) {
      setError(e.response?.data?.message || "Error deleting product");
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className={H1_CLASS}>Products</h1>
        <Link
          to="/admin/products/new"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          + New Product
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet."
          action={
            <Link to="/admin/products/new" className="text-brand-600 hover:underline text-sm font-medium">
              Create your first product →
            </Link>
          }
        />
      ) : (
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
      )}
    </div>
  );
}
