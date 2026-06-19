// Run with: node scripts/seed.js  (from the server/ directory)
import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import Category from "../src/models/Category.js";
import Product from "../src/models/Product.js";
import ProductVariant from "../src/models/ProductVariant.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const UNS = (id) =>
  `https://images.unsplash.com/photo-${id}?w=600&h=750&fit=crop&q=80&auto=format`;

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected.");

  await ProductVariant.deleteMany({});
  await Product.deleteMany({});
  await Category.deleteMany({});

  // ── Categories ──────────────────────────────────────────────────────────────
  const [shirts, pants, shoes] = await Category.insertMany([
    { name: "Shirts", slug: "shirts" },
    { name: "Pants", slug: "pants" },
    { name: "Shoes", slug: "shoes" },
  ]);

  // Demonstrates unlimited nesting: Shoes > Sneakers / Formal Shoes
  const [sneakers, formalShoes] = await Category.insertMany([
    { name: "Sneakers", slug: "sneakers", parent: shoes._id, level: 1, path: [shoes._id] },
    { name: "Formal Shoes", slug: "formal-shoes", parent: shoes._id, level: 1, path: [shoes._id] },
  ]);

  // ── Products + variants ──────────────────────────────────────────────────────
  const p1 = await Product.create({
    name: "Classic Cotton Shirt",
    slug: "classic-cotton-shirt",
    description: "A timeless cotton shirt for everyday wear. Comfortable, breathable, and easy to style.",
    categories: [shirts._id],
    basePrice: 1200,
    images: [
      { url: UNS("1598300042247-d088f8ab3a91"), altText: "Classic Cotton Shirt – front", sortOrder: 0 },
      { url: UNS("1521572163474-6864f9cf17ab"), altText: "Classic Cotton Shirt – detail", sortOrder: 1 },
      { url: UNS("1603252109303-2751441dd157"), altText: "Classic Cotton Shirt – styled", sortOrder: 2 },
    ],
  });
  await ProductVariant.insertMany([
    { productId: p1._id, size: "S",  color: "White", sku: "CSHIRT-S-WHT",  stockQuantity: 10 },
    { productId: p1._id, size: "M",  color: "White", sku: "CSHIRT-M-WHT",  stockQuantity: 5  },
    { productId: p1._id, size: "M",  color: "Blue",  sku: "CSHIRT-M-BLU",  stockQuantity: 0  },
    { productId: p1._id, size: "L",  color: "White", sku: "CSHIRT-L-WHT",  stockQuantity: 8  },
    { productId: p1._id, size: "L",  color: "Blue",  sku: "CSHIRT-L-BLU",  price: 1350, stockQuantity: 3 },
    { productId: p1._id, size: "XL", color: "White", sku: "CSHIRT-XL-WHT", stockQuantity: 4  },
  ]);

  const p2 = await Product.create({
    name: "Linen Summer Shirt",
    slug: "linen-summer-shirt",
    description: "Breathable linen shirt, perfect for Nepal's warm summers. Relaxed fit.",
    categories: [shirts._id],
    basePrice: 1800,
    images: [
      { url: UNS("1602810318383-e386cc2a3ccf"), altText: "Linen Summer Shirt – front", sortOrder: 0 },
      { url: UNS("1490481651871-ab68de25d43d"), altText: "Linen Summer Shirt – lifestyle", sortOrder: 1 },
    ],
  });
  await ProductVariant.insertMany([
    { productId: p2._id, size: "S",  color: "Beige", sku: "LSHIRT-S-BEI",  stockQuantity: 12 },
    { productId: p2._id, size: "M",  color: "Beige", sku: "LSHIRT-M-BEI",  stockQuantity: 9  },
    { productId: p2._id, size: "L",  color: "Beige", sku: "LSHIRT-L-BEI",  stockQuantity: 4  },
    { productId: p2._id, size: "M",  color: "White", sku: "LSHIRT-M-WHT",  stockQuantity: 6  },
  ]);

  const p3 = await Product.create({
    name: "Slim Fit Chinos",
    slug: "slim-fit-chinos",
    description: "Modern slim-fit chinos for a sharp, clean look. Suitable for office or casual wear.",
    categories: [pants._id],
    basePrice: 2500,
    images: [
      { url: UNS("1624378439575-d8705ad7ae80"), altText: "Slim Fit Chinos – front", sortOrder: 0 },
      { url: UNS("1506629082955-511b1aa562c8"), altText: "Slim Fit Chinos – detail", sortOrder: 1 },
    ],
  });
  await ProductVariant.insertMany([
    { productId: p3._id, size: "30", color: "Khaki", sku: "CHINO-30-KHA", stockQuantity: 7 },
    { productId: p3._id, size: "32", color: "Khaki", sku: "CHINO-32-KHA", stockQuantity: 4 },
    { productId: p3._id, size: "32", color: "Navy",  sku: "CHINO-32-NAV", stockQuantity: 6 },
    { productId: p3._id, size: "34", color: "Khaki", sku: "CHINO-34-KHA", stockQuantity: 0 },
    { productId: p3._id, size: "34", color: "Navy",  sku: "CHINO-34-NAV", stockQuantity: 3 },
  ]);

  const p4 = await Product.create({
    name: "Cargo Joggers",
    slug: "cargo-joggers",
    description: "Street-style cargo joggers with side pockets. Elastic waistband for a flexible fit.",
    categories: [pants._id],
    basePrice: 1950,
    images: [
      { url: UNS("1552902865-b72c031ac5ea"), altText: "Cargo Joggers – front", sortOrder: 0 },
      { url: UNS("1542272604-787c3835535d"), altText: "Cargo Joggers – detail", sortOrder: 1 },
    ],
  });
  await ProductVariant.insertMany([
    { productId: p4._id, size: "S",  color: "Black", sku: "CARGO-S-BLK",  stockQuantity: 8  },
    { productId: p4._id, size: "M",  color: "Black", sku: "CARGO-M-BLK",  stockQuantity: 11 },
    { productId: p4._id, size: "L",  color: "Black", sku: "CARGO-L-BLK",  stockQuantity: 5  },
    { productId: p4._id, size: "M",  color: "Olive", sku: "CARGO-M-OLV",  stockQuantity: 0  },
  ]);

  const p5 = await Product.create({
    name: "Running Sneakers",
    slug: "running-sneakers",
    description: "Lightweight, cushioned sneakers built for daily runs and casual everyday wear.",
    categories: [sneakers._id],
    basePrice: 4500,
    images: [
      { url: UNS("1542291026-7eec264c27ff"), altText: "Running Sneakers – side", sortOrder: 0 },
      { url: UNS("1491553895911-0055eca6402d"), altText: "Running Sneakers – lifestyle", sortOrder: 1 },
      { url: UNS("1519222970733-f546218fa6d7"), altText: "Running Sneakers – white pair", sortOrder: 2 },
    ],
  });
  await ProductVariant.insertMany([
    { productId: p5._id, size: "41", color: "Black", sku: "SNKR-41-BLK", stockQuantity: 5  },
    { productId: p5._id, size: "42", color: "Black", sku: "SNKR-42-BLK", stockQuantity: 3  },
    { productId: p5._id, size: "42", color: "White", sku: "SNKR-42-WHT", price: 4800, stockQuantity: 2 },
    { productId: p5._id, size: "43", color: "Black", sku: "SNKR-43-BLK", stockQuantity: 0  },
    { productId: p5._id, size: "43", color: "Red",   sku: "SNKR-43-RED", price: 5000, stockQuantity: 1 },
  ]);

  const p6 = await Product.create({
    name: "Leather Loafers",
    slug: "leather-loafers",
    description: "Classic leather loafers for formal or smart-casual occasions. Premium quality.",
    categories: [formalShoes._id],
    basePrice: 6500,
    images: [
      { url: UNS("1449505278894-297fdb3edbc1"), altText: "Leather Loafers – side", sortOrder: 0 },
      { url: UNS("1614252369475-531eba835eb1"), altText: "Leather Loafers – top", sortOrder: 1 },
    ],
  });
  await ProductVariant.insertMany([
    { productId: p6._id, size: "40", color: "Brown", sku: "LOAF-40-BRN", stockQuantity: 3 },
    { productId: p6._id, size: "41", color: "Brown", sku: "LOAF-41-BRN", stockQuantity: 4 },
    { productId: p6._id, size: "42", color: "Brown", sku: "LOAF-42-BRN", stockQuantity: 2 },
    { productId: p6._id, size: "42", color: "Black", sku: "LOAF-42-BLK", stockQuantity: 5 },
  ]);

  console.log("Seeded: 5 categories (incl. 2 nested under Shoes), 6 products, 29 variants");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
