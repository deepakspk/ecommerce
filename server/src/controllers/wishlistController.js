import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

async function getOrCreate(userId) {
  let wishlist = await Wishlist.findOne({ userId });
  if (!wishlist) wishlist = await Wishlist.create({ userId, items: [] });
  return wishlist;
}

function populateWishlist(wishlist) {
  return wishlist.populate({ path: "items.productId", select: "name slug basePrice images" });
}

export async function getWishlist(req, res) {
  const wishlist = await Wishlist.findOne({ userId: req.user._id });
  if (!wishlist) return res.json({ items: [] });
  await populateWishlist(wishlist);
  res.json({ items: wishlist.items });
}

export async function addItem(req, res) {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const wishlist = await getOrCreate(req.user._id);
  const exists = wishlist.items.some((i) => i.productId.equals(productId));
  if (!exists) {
    wishlist.items.push({ productId });
    await wishlist.save();
  }

  res.json({ message: "Added to wishlist", itemCount: wishlist.items.length });
}

export async function removeItem(req, res) {
  const wishlist = await Wishlist.findOne({ userId: req.user._id });
  if (!wishlist) return res.status(404).json({ message: "Wishlist not found" });

  const before = wishlist.items.length;
  wishlist.items = wishlist.items.filter((i) => !i.productId.equals(req.params.productId));
  if (wishlist.items.length === before) return res.status(404).json({ message: "Item not in wishlist" });

  await wishlist.save();
  res.json({ message: "Removed" });
}

export async function clearWishlist(req, res) {
  await Wishlist.findOneAndUpdate({ userId: req.user._id }, { items: [] });
  res.json({ message: "Wishlist cleared" });
}

// Called on login to merge a guest wishlist stored in localStorage
export async function mergeWishlist(req, res) {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.json({ message: "Nothing to merge" });

  const wishlist = await getOrCreate(req.user._id);

  for (const guestItem of items) {
    if (!guestItem.productId) continue;
    const product = await Product.findById(guestItem.productId).catch(() => null);
    if (!product) continue;

    const exists = wishlist.items.some((i) => i.productId.equals(guestItem.productId));
    if (!exists) wishlist.items.push({ productId: guestItem.productId });
  }

  await wishlist.save();
  res.json({ message: "Merged" });
}
