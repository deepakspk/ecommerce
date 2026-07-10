// Run with: node scripts/setCategoryImages.js  (from the server/ directory)
//
// Points categories that have no image yet at the bundled SVG tiles in
// client/public/categories/. Never overwrites an image an admin uploaded;
// safe to re-run.
import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import Category from "../src/models/Category.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const IMAGES = {
  business: "/categories/business.svg",
  "childrens-books": "/categories/childrens-books.svg",
  "comics--novels": "/categories/comics--novels.svg",
  history: "/categories/history.svg",
  "literature--fiction": "/categories/literature--fiction.svg",
  "teen--young-adult": "/categories/teen--young-adult.svg",
  "lifestyle--wellness": "/categories/lifestyle--wellness.svg",
  architecture: "/categories/architecture.svg",
  "art--craft": "/categories/art--craft.svg",
  biography: "/categories/biography.svg",
  "religion--spirituality": "/categories/religion--spirituality.svg",
};

// Slugs whose existing (uploaded) image should be replaced by the SVG tile.
const FORCE_SLUGS = new Set(["art--craft", "biography", "religion--spirituality"]);

await mongoose.connect(process.env.MONGODB_URI);

let updated = 0;
for (const [slug, image] of Object.entries(IMAGES)) {
  const filter = FORCE_SLUGS.has(slug)
    ? { slug, image: { $ne: image } }
    : { slug, $or: [{ image: "" }, { image: { $exists: false } }] };
  const { modifiedCount } = await Category.updateOne(filter, { $set: { image } });
  if (modifiedCount) {
    updated++;
    console.log(`set ${slug} -> ${image}`);
  } else {
    console.log(`skipped ${slug} (not found or already up to date)`);
  }
}

console.log(`Updated ${updated} categor${updated === 1 ? "y" : "ies"}`);
await mongoose.disconnect();
