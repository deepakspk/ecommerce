import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import * as adminApi from "../../api/admin";
import { AddressForm } from "../../components/AddressForm";
import { H1_CLASS, CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY, BUTTON_SECONDARY } from "../../utils/ui";

const fmt = (n) => `Rs. ${Number(n).toLocaleString()}`;

function SectionCard({ step, title, children }) {
  return (
    <div className={`${CARD_CLASS} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">{step}</span>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function CustomerPicker({ selected, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let active = true;
    setSearching(true);
    const t = setTimeout(() => {
      adminApi.listUsers({ search: query.trim(), limit: 8 })
        .then(({ users }) => { if (active) setResults(users); })
        .catch(() => { if (active) setResults([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 bg-gray-50 dark:bg-gray-800">
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{selected.name}</p>
          <p className="text-xs text-gray-400">{selected.email}{selected.email && selected.phone && " · "}{selected.phone}</p>
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-xs text-brand-600 hover:underline font-medium">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search customer by name, email, or phone…"
        className={INPUT_CLASS}
      />
      {query.trim() && (
        <div className="mt-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
          {searching ? (
            <p className="px-3 py-2 text-xs text-gray-400">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">No customers found.</p>
          ) : (
            results.map((u) => (
              <button
                key={u._id}
                type="button"
                onClick={() => { onSelect(u); setQuery(""); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                <p className="font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                <p className="text-xs text-gray-400">{u.email}{u.email && u.phone && " · "}{u.phone}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ItemPicker({ onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let active = true;
    setSearching(true);
    const t = setTimeout(() => {
      adminApi.getProducts({ search: query.trim(), limit: 8 })
        .then(({ products }) => { if (active) setResults(products); })
        .catch(() => { if (active) setResults([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  async function pickProduct(p) {
    setProduct(p);
    setQuery("");
    setResults([]);
    setVariantId("");
    const { variants } = await adminApi.getProduct(p._id);
    setVariants(variants);
  }

  function handleAdd() {
    const variant = variants.find((v) => v._id === variantId);
    if (!variant || !quantity) return;
    onAdd({
      variantId: variant._id,
      productName: product.name,
      size: variant.size,
      color: variant.color,
      unitPrice: variant.price ?? product.basePrice,
      quantity: Number(quantity),
      stockQuantity: variant.stockQuantity,
    });
    setProduct(null);
    setVariants([]);
    setVariantId("");
    setQuantity(1);
  }

  if (!product) {
    return (
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product to add…"
          className={INPUT_CLASS}
        />
        {query.trim() && (
          <div className="mt-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {searching ? (
              <p className="px-3 py-2 text-xs text-gray-400">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No products found.</p>
            ) : (
              results.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => pickProduct(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {p.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</p>
        <button type="button" onClick={() => setProduct(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:underline">Cancel</button>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className={`${INPUT_CLASS} w-auto`}>
          <option value="">Select size/color…</option>
          {variants.map((v) => (
            <option key={v._id} value={v._id} disabled={v.stockQuantity <= 0}>
              {v.size} / {v.color} — {v.stockQuantity} in stock{v.stockQuantity <= 0 ? " (out of stock)" : ""}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={`${INPUT_CLASS} w-20`}
        />
        <button type="button" onClick={handleAdd} disabled={!variantId} className={`${BUTTON_PRIMARY} disabled:opacity-50`}>
          Add item
        </button>
      </div>
    </div>
  );
}

export default function AdminOrderCreatePage() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [address, setAddress] = useState(null);
  const [editingAddress, setEditingAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [couponCode, setCouponCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function removeItem(variantId) {
    setItems((list) => list.filter((i) => i.variantId !== variantId));
  }

  function updateQuantity(variantId, quantity) {
    setItems((list) => list.map((i) => (i.variantId === variantId ? { ...i, quantity: Number(quantity) } : i)));
  }

  function handleAddressSave(form) {
    setAddress(form);
    setEditingAddress(false);
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  async function handleSubmit() {
    setError("");
    if (!customer) return setError("Select a customer first");
    if (items.length === 0) return setError("Add at least one item");
    if (!address) return setError("Add a shipping address");

    setSubmitting(true);
    try {
      const { order } = await adminApi.createAdminOrder({
        userId: customer._id,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        address,
        paymentMethod,
        couponCode: couponCode.trim() || undefined,
      });
      navigate(`/admin/orders/${order._id}`);
    } catch (e) {
      setError(e.response?.data?.message || "Error creating order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/orders" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm">← Back</Link>
        <h1 className={H1_CLASS}>New Order</h1>
      </div>

      <div className="space-y-5">
        <SectionCard step={1} title="Customer">
          <CustomerPicker selected={customer} onSelect={setCustomer} />
        </SectionCard>

        <SectionCard step={2} title="Items">
          {items.length > 0 && (
            <table className="w-full text-sm mb-3">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((i) => (
                  <tr key={i.variantId}>
                    <td className="py-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{i.productName}</p>
                      <p className="text-xs text-gray-400">{i.size} / {i.color}</p>
                    </td>
                    <td className="py-2 w-20">
                      <input
                        type="number"
                        min="1"
                        max={i.stockQuantity}
                        value={i.quantity}
                        onChange={(e) => updateQuantity(i.variantId, e.target.value)}
                        className={`${INPUT_CLASS} w-20`}
                      />
                    </td>
                    <td className="py-2 text-right font-medium text-gray-700 dark:text-gray-200">{fmt(i.unitPrice * i.quantity)}</td>
                    <td className="py-2 text-right w-10">
                      <button type="button" onClick={() => removeItem(i.variantId)} className="text-red-500 hover:underline text-xs">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <ItemPicker onAdd={(item) => setItems((list) => [...list, item])} />
          {items.length > 0 && (
            <p className="text-right text-sm font-semibold text-gray-900 dark:text-gray-100 mt-3">Subtotal: {fmt(subtotal)}</p>
          )}
        </SectionCard>

        <SectionCard step={3} title="Shipping Address">
          {!editingAddress && address ? (
            <div className="flex items-start justify-between border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium text-gray-900 dark:text-gray-100">{address.recipientName} — {address.phone}</p>
                <p>{[address.area, address.street, address.city, address.district, address.province].filter(Boolean).join(", ")}</p>
                {address.landmark && <p className="text-xs text-gray-400">Near: {address.landmark}</p>}
              </div>
              <button type="button" onClick={() => setEditingAddress(true)} className="text-xs text-brand-600 hover:underline font-medium">
                Edit
              </button>
            </div>
          ) : (
            <AddressForm
              initial={address || undefined}
              onSave={handleAddressSave}
              onCancel={address ? () => setEditingAddress(false) : undefined}
              showLabelAndDefault={false}
            />
          )}
        </SectionCard>

        <SectionCard step={4} title="Payment">
          <div className="flex flex-wrap gap-3">
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={`${INPUT_CLASS} w-auto`}>
              <option value="COD">Cash on Delivery</option>
              <option value="ESEWA">eSewa</option>
              <option value="KHALTI">Khalti</option>
            </select>
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Coupon code (optional)"
              className={`${INPUT_CLASS} max-w-xs font-mono`}
            />
          </div>
        </SectionCard>

        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={submitting} className={`${BUTTON_PRIMARY} disabled:opacity-50`}>
            {submitting ? "Creating…" : "Create Order"}
          </button>
          <Link to="/admin/orders" className={BUTTON_SECONDARY}>Cancel</Link>
        </div>
      </div>
    </div>
  );
}
