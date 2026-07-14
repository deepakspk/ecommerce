// Assigns products to the "Best Seller" and "New Arrival" feature types so the
// homepage feature rails have something to show.
// Run with: node scripts/seedFeatureProducts.js  (from the server/ directory)
import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import Product from "../src/models/Product.js";
import FeatureType from "../src/models/FeatureType.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const ASSIGN_PER_TYPE = 8;

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected.");

  const featureTypes = await FeatureType.find({ isActive: true }).sort("sortOrder");
  if (featureTypes.length === 0) {
    console.log("No active feature types found — create some in Admin → Feature Types first.");
    await mongoose.disconnect();
    return;
  }

  for (const [index, featureType] of featureTypes.entries()) {
    const already = await Product.countDocuments({ featureTypes: featureType._id, isActive: true });
    if (already >= ASSIGN_PER_TYPE) {
      console.log(`"${featureType.name}" already has ${already} products — skipping.`);
      continue;
    }
    // Offset per feature type so each rail gets a different slice of the catalog
    const products = await Product.find({ isActive: true, featureTypes: { $ne: featureType._id } })
      .sort("-createdAt")
      .skip(index * ASSIGN_PER_TYPE)
      .limit(ASSIGN_PER_TYPE - already);
    await Product.updateMany(
      { _id: { $in: products.map((p) => p._id) } },
      { $addToSet: { featureTypes: featureType._id } }
    );
    console.log(`"${featureType.name}": assigned ${products.length} products.`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
