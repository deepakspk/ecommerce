// Run with: node scripts/seedCategories.js  (from the server/ directory)
//
// Wipes the Category collection and replaces it with a common, multi-level
// e-commerce taxonomy. Clears the `categories` field on existing products
// since their old category ids no longer exist — re-tag them afterward
// via the admin UI.
import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import Category from "../src/models/Category.js";
import Product from "../src/models/Product.js";
import { createCategory } from "../src/services/categoryService.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const TAXONOMY = [
  {
    name: "Electronics",
    children: [
      { name: "Mobile Phones", children: [{ name: "Android Phones" }, { name: "iPhones" }] },
      { name: "Laptops", children: [{ name: "Gaming Laptops" }, { name: "Business Laptops" }] },
      { name: "Cameras & Photography" },
      { name: "Audio & Headphones" },
      { name: "Accessories" },
    ],
  },
  {
    name: "Fashion",
    children: [
      { name: "Men", children: [{ name: "Shirts" }, { name: "T-Shirts" }, { name: "Pants" }, { name: "Footwear" }] },
      { name: "Women", children: [{ name: "Dresses" }, { name: "Tops" }, { name: "Footwear" }] },
      { name: "Kids", children: [{ name: "Boys" }, { name: "Girls" }] },
    ],
  },
  {
    name: "Home & Kitchen",
    children: [
      { name: "Furniture" },
      { name: "Kitchen & Dining" },
      { name: "Home Decor" },
      { name: "Bedding & Bath" },
    ],
  },
  {
    name: "Beauty & Personal Care",
    children: [{ name: "Skincare" }, { name: "Haircare" }, { name: "Makeup" }, { name: "Fragrances" }],
  },
  {
    name: "Sports & Outdoors",
    children: [{ name: "Fitness Equipment" }, { name: "Outdoor & Camping" }, { name: "Cycling" }],
  },
  {
    name: "Books & Stationery",
    children: [{ name: "Fiction" }, { name: "Non-Fiction" }, { name: "Office Supplies" }],
  },
  {
    name: "Toys & Games",
    children: [{ name: "Action Figures" }, { name: "Board Games" }, { name: "Educational Toys" }],
  },
  {
    name: "Grocery & Gourmet",
    children: [{ name: "Beverages" }, { name: "Snacks" }, { name: "Staples" }],
  },
  {
    name: "Health & Wellness",
    children: [{ name: "Supplements" }, { name: "Personal Care Devices" }],
  },
];

async function insertTree(nodes, parentId) {
  let count = 0;
  for (const node of nodes) {
    const category = await createCategory({ name: node.name, parent: parentId });
    count += 1;
    if (node.children?.length) {
      count += await insertTree(node.children, category._id);
    }
  }
  return count;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected.");

  await Category.deleteMany({});
  await Product.updateMany({}, { $set: { categories: [] } });

  const total = await insertTree(TAXONOMY, null);
  console.log(`Seeded ${total} categories across ${TAXONOMY.length} top-level departments.`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
