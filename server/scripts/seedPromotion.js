// Run with: node scripts/seedPromotion.js  (from the server/ directory)
import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import Promotion from "../src/models/Promotion.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const UNS = (id, w, h) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80&auto=format`;

const TITLE = "Dashain Mega Sale";

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected.");

  await Promotion.deleteMany({ title: TITLE });

  const now = new Date();
  const visibleFrom = new Date(now);
  visibleFrom.setHours(0, 0, 0, 0);
  const visibleUntil = new Date(now);
  visibleUntil.setDate(visibleUntil.getDate() + 30);
  visibleUntil.setHours(23, 59, 59, 0);

  const promotion = await Promotion.create({
    title: TITLE,
    visibleFrom,
    visibleUntil,
    isActive: true,
    webBannerUrl: UNS("1607083206869-4c7672e72a8a", 1200, 300),
    mobileBannerUrl: UNS("1607083206869-4c7672e72a8a", 800, 400),
    webPopupUrl: UNS("1483985988355-763728e1935b", 500, 600),
    mobilePopupUrl: UNS("1483985988355-763728e1935b", 360, 480),
  });

  console.log(`Created promotion "${promotion.title}" (${promotion._id})`);
  console.log(`  Visible: ${promotion.visibleFrom.toDateString()} – ${promotion.visibleUntil.toDateString()}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
