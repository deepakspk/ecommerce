import { useState, useEffect, useCallback, useRef } from "react";
import CartContext from "./CartContext";
import { useAuth } from "../hooks/useAuth";
import * as cartApi from "../api/cart";

const GUEST_KEY = "ecommerce_guest_cart";

function readGuest() {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) || "[]"); } catch { return []; }
}
function writeGuest(items) { localStorage.setItem(GUEST_KEY, JSON.stringify(items)); }
function clearGuest() { localStorage.removeItem(GUEST_KEY); }

// Shape coming back from the server after populate
function normalizeServerItem(item) {
  const v = item.variantId;
  const p = v.productId;
  return {
    variantId: String(v._id),
    quantity: item.quantity,
    size: v.size,
    color: v.color,
    sku: v.sku,
    variantPrice: v.price ?? null,
    stockQuantity: v.stockQuantity,
    productId: String(p._id),
    productName: p.name,
    productSlug: p.slug,
    basePrice: p.basePrice,
    imageUrl: v.imageUrl || p.images?.[0]?.url || null,
  };
}

export default function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  // undefined = not yet initialized after auth resolves
  const prevUserIdRef = useRef(undefined);

  const loadServer = useCallback(async () => {
    try {
      const { items: raw } = await cartApi.getCart();
      setItems(raw.map(normalizeServerItem));
    } catch {
      setItems([]);
    }
  }, []);

  const loadGuest = useCallback(() => {
    setItems(readGuest());
  }, []);

  const mergeAndReload = useCallback(async () => {
    const guest = readGuest();
    if (guest.length > 0) {
      try {
        await cartApi.mergeCart(guest.map((i) => ({ variantId: i.variantId, quantity: i.quantity })));
      } catch { /* merge failure is non-fatal */ }
      clearGuest();
    }
    await loadServer();
  }, [loadServer]);

  // React to auth state: initial load + login/logout transitions
  useEffect(() => {
    if (authLoading) return;

    const prev = prevUserIdRef.current;
    const cur = user?.id ?? null;

    if (prev === undefined) {
      // First resolution after app boot
      prevUserIdRef.current = cur;
      const init = async () => {
        if (cur) await loadServer(); else loadGuest();
        setLoading(false);
      };
      init();
      return;
    }

    if (prev === cur) return; // same user, no action needed
    prevUserIdRef.current = cur;

    if (!prev && cur) {
      // Logged in → merge guest cart then pull server cart
      mergeAndReload().finally(() => setLoading(false));
    } else if (prev && !cur) {
      // Logged out → show guest cart (empty unless items were saved)
      loadGuest();
      setLoading(false);
    }
  }, [authLoading, user, loadServer, loadGuest, mergeAndReload]);

  // ── addItem ──────────────────────────────────────────────────────────────
  const addItem = useCallback(async (variantId, quantity, variant, product) => {
    if (user) {
      await cartApi.addToCart(variantId, quantity);
      await loadServer();
    } else {
      const cur = readGuest();
      const existing = cur.find((i) => i.variantId === String(variantId));
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > variant.stockQuantity) {
          throw new Error(`Only ${variant.stockQuantity} in stock (${existing.quantity} already in cart)`);
        }
        existing.quantity = newQty;
      } else {
        if (quantity > variant.stockQuantity) {
          throw new Error(`Only ${variant.stockQuantity} in stock`);
        }
        cur.push({
          variantId: String(variantId),
          quantity,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          variantPrice: variant.price ?? null,
          stockQuantity: variant.stockQuantity,
          productId: String(product._id),
          productName: product.name,
          productSlug: product.slug,
          basePrice: product.basePrice,
          imageUrl: variant.imageUrl || product.images?.[0]?.url || null,
        });
      }
      writeGuest(cur);
      setItems([...cur]);
    }
  }, [user, loadServer]);

  // ── updateQuantity ────────────────────────────────────────────────────────
  const updateQuantity = useCallback(async (variantId, quantity) => {
    if (user) {
      await cartApi.updateItem(variantId, quantity);
      await loadServer();
    } else {
      const cur = readGuest();
      const item = cur.find((i) => i.variantId === String(variantId));
      if (!item) return;
      if (quantity > item.stockQuantity) throw new Error(`Only ${item.stockQuantity} in stock`);
      item.quantity = quantity;
      writeGuest(cur);
      setItems([...cur]);
    }
  }, [user, loadServer]);

  // ── removeItem ────────────────────────────────────────────────────────────
  const removeItem = useCallback(async (variantId) => {
    if (user) {
      await cartApi.removeItem(variantId);
      await loadServer();
    } else {
      const cur = readGuest().filter((i) => i.variantId !== String(variantId));
      writeGuest(cur);
      setItems(cur);
    }
  }, [user, loadServer]);

  // ── clearCart ─────────────────────────────────────────────────────────────
  const clearCart = useCallback(async () => {
    if (user) await cartApi.clearCart();
    clearGuest();
    setItems([]);
  }, [user]);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.quantity * (i.variantPrice ?? i.basePrice), 0);

  return (
    <CartContext.Provider value={{ items, itemCount, subtotal, loading, addItem, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}
