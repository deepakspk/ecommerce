import Cart from "../models/Cart.js";
import ProductVariant from "../models/ProductVariant.js";

async function getOrCreate(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = await Cart.create({ userId, items: [] });
  return cart;
}

function populateCart(cart) {
  return cart.populate({
    path: "items.variantId",
    populate: { path: "productId", select: "name slug basePrice images" },
  });
}

export async function getCart(req, res) {
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) return res.json({ items: [] });
  await populateCart(cart);
  res.json({ items: cart.items });
}

export async function addToCart(req, res) {
  const { variantId, quantity = 1 } = req.body;
  if (!variantId) return res.status(400).json({ message: "variantId is required" });
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ message: "quantity must be a positive integer" });

  const variant = await ProductVariant.findById(variantId);
  if (!variant) return res.status(404).json({ message: "Variant not found" });

  const cart = await getOrCreate(req.user._id);
  const existing = cart.items.find((i) => i.variantId.equals(variantId));
  const currentQty = existing ? existing.quantity : 0;
  const newQty = currentQty + qty;

  if (newQty > variant.stockQuantity) {
    return res.status(400).json({
      message: `Only ${variant.stockQuantity} in stock${currentQty > 0 ? ` (${currentQty} already in your cart)` : ""}`,
    });
  }

  if (existing) {
    existing.quantity = newQty;
  } else {
    cart.items.push({ variantId, quantity: qty });
  }

  await cart.save();
  res.json({ message: "Added to cart", itemCount: cart.items.reduce((s, i) => s + i.quantity, 0) });
}

export async function updateItem(req, res) {
  const { variantId } = req.params;
  const qty = Number(req.body.quantity);
  if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ message: "quantity must be a positive integer" });

  const variant = await ProductVariant.findById(variantId);
  if (!variant) return res.status(404).json({ message: "Variant not found" });
  if (qty > variant.stockQuantity) {
    return res.status(400).json({ message: `Only ${variant.stockQuantity} in stock` });
  }

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  const item = cart.items.find((i) => i.variantId.equals(variantId));
  if (!item) return res.status(404).json({ message: "Item not in cart" });

  item.quantity = qty;
  await cart.save();
  res.json({ message: "Updated" });
}

export async function removeItem(req, res) {
  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  const before = cart.items.length;
  cart.items = cart.items.filter((i) => !i.variantId.equals(req.params.variantId));
  if (cart.items.length === before) return res.status(404).json({ message: "Item not in cart" });

  await cart.save();
  res.json({ message: "Removed" });
}

export async function clearCart(req, res) {
  await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [] });
  res.json({ message: "Cart cleared" });
}

// Called on login to merge a guest cart stored in localStorage
export async function mergeCart(req, res) {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.json({ message: "Nothing to merge" });

  const cart = await getOrCreate(req.user._id);

  for (const guestItem of items) {
    if (!guestItem.variantId) continue;
    const variant = await ProductVariant.findById(guestItem.variantId).catch(() => null);
    if (!variant) continue;

    const guestQty = Math.max(1, Number(guestItem.quantity) || 1);
    const existing = cart.items.find((i) => i.variantId.equals(guestItem.variantId));
    const currentQty = existing ? existing.quantity : 0;
    const mergedQty = Math.min(currentQty + guestQty, variant.stockQuantity);
    if (mergedQty <= 0) continue;

    if (existing) {
      existing.quantity = mergedQty;
    } else {
      cart.items.push({ variantId: guestItem.variantId, quantity: mergedQty });
    }
  }

  await cart.save();
  res.json({ message: "Merged" });
}
