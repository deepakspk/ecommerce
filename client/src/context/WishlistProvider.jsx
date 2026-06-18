import { useState, useEffect, useCallback, useRef } from "react";
import WishlistContext from "./WishlistContext";
import { useAuth } from "../hooks/useAuth";
import * as wishlistApi from "../api/wishlist";

const GUEST_KEY = "ecommerce_guest_wishlist";

function readGuest() {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) || "[]"); } catch { return []; }
}
function writeGuest(items) { localStorage.setItem(GUEST_KEY, JSON.stringify(items)); }
function clearGuest() { localStorage.removeItem(GUEST_KEY); }

// Shape coming back from the server after populate
function normalizeServerItem(item) {
  const p = item.productId;
  return {
    productId: String(p._id),
    productName: p.name,
    productSlug: p.slug,
    basePrice: p.basePrice,
    imageUrl: p.images?.[0]?.url || null,
  };
}

function normalizeGuestProduct(product) {
  return {
    productId: String(product._id),
    productName: product.name,
    productSlug: product.slug,
    basePrice: product.basePrice,
    imageUrl: product.images?.[0]?.url || null,
  };
}

export default function WishlistProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  // undefined = not yet initialized after auth resolves
  const prevUserIdRef = useRef(undefined);

  const loadServer = useCallback(async () => {
    try {
      const { items: raw } = await wishlistApi.getWishlist();
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
        await wishlistApi.mergeWishlist(guest.map((i) => ({ productId: i.productId })));
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
      // Logged in → merge guest wishlist then pull server wishlist
      mergeAndReload().finally(() => setLoading(false));
    } else if (prev && !cur) {
      // Logged out → show guest wishlist (empty unless items were saved)
      loadGuest();
      setLoading(false);
    }
  }, [authLoading, user, loadServer, loadGuest, mergeAndReload]);

  const isWishlisted = useCallback(
    (productId) => items.some((i) => i.productId === String(productId)),
    [items]
  );

  // ── addItem ──────────────────────────────────────────────────────────────
  const addItem = useCallback(async (product) => {
    if (user) {
      await wishlistApi.addToWishlist(product._id);
      await loadServer();
    } else {
      const cur = readGuest();
      if (cur.some((i) => i.productId === String(product._id))) return;
      cur.push(normalizeGuestProduct(product));
      writeGuest(cur);
      setItems([...cur]);
    }
  }, [user, loadServer]);

  // ── removeItem ────────────────────────────────────────────────────────────
  const removeItem = useCallback(async (productId) => {
    if (user) {
      await wishlistApi.removeItem(productId);
      await loadServer();
    } else {
      const cur = readGuest().filter((i) => i.productId !== String(productId));
      writeGuest(cur);
      setItems(cur);
    }
  }, [user, loadServer]);

  // ── toggleItem ───────────────────────────────────────────────────────────
  const toggleItem = useCallback(async (product) => {
    if (isWishlisted(product._id)) await removeItem(product._id);
    else await addItem(product);
  }, [isWishlisted, addItem, removeItem]);

  // ── clearWishlist ────────────────────────────────────────────────────────
  const clearWishlist = useCallback(async () => {
    if (user) await wishlistApi.clearWishlist();
    clearGuest();
    setItems([]);
  }, [user]);

  const itemCount = items.length;

  return (
    <WishlistContext.Provider
      value={{ items, itemCount, loading, isWishlisted, addItem, removeItem, toggleItem, clearWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
