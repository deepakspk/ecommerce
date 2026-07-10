// Run with: node scripts/backfillTrackingIds.js  (from the server/ directory)
//
// Assigns a tracking id to every order created before the trackingId field
// existed. Safe to re-run — orders that already have one are skipped.
import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import Order from "../src/models/Order.js";
import { generateTrackingId } from "../src/utils/trackingId.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

await mongoose.connect(process.env.MONGODB_URI);

const orders = await Order.find({ trackingId: { $exists: false } }).select("_id");
console.log(`${orders.length} order(s) missing a tracking id`);

let updated = 0;
for (const { _id } of orders) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await Order.updateOne({ _id }, { $set: { trackingId: generateTrackingId() } });
      updated++;
      break;
    } catch (err) {
      if (err.code !== 11000 || attempt === 4) throw err;
    }
  }
}

console.log(`Backfilled ${updated} order(s)`);
await mongoose.disconnect();
