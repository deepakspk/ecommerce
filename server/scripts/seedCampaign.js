// Run with: node scripts/seedCampaign.js  (from the server/ directory)
import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import Campaign from "../src/models/Campaign.js";
import Product from "../src/models/Product.js";
import { getDiscountedPrice } from "../src/utils/pricing.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const UNS = (id, w, h) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80&auto=format`;

const NAME = "Flash Sale";
const SLUG = "flash-sale";

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected.");

  await Campaign.deleteMany({ slug: SLUG });

  const products = await Product.find({ isActive: true }).limit(12);
  if (products.length === 0) {
    console.log("No active products found — seed products first.");
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - 60 * 60 * 1000); // started an hour ago
  const endDate = new Date(now.getTime() + 32 * 60 * 60 * 1000); // ends in ~32 hours

  const campaign = await Campaign.create({
    name: NAME,
    slug: SLUG,
    description: "Hurry up! Limited time offers",
    startDate,
    endDate,
    desktopBannerUrl: UNS("1607083206869-4c7672e72a8a", 1200, 400),
    mobileBannerUrl: UNS("1607083206869-4c7672e72a8a", 600, 800),
    actionImageUrl: UNS("1549465220-1a8b9238cd48", 200, 200),
    buttonLabel: "View All",
    themeColor: "#dc2626",
    isActive: true,
    // Special price ~20% under each product's current selling price on every
    // other product, so the seed shows both priced and regular campaign items.
    products: products.map((p, i) => {
      const selling = getDiscountedPrice(p.basePrice, p).finalPrice;
      return {
        product: p._id,
        specialPrice: i % 2 === 0 ? Math.max(1, Math.round(selling * 0.8)) : null,
      };
    }),
  });

  console.log(`Created campaign "${campaign.name}" (${campaign._id})`);
  console.log(`  ${campaign.products.length} products, runs until ${campaign.endDate.toLocaleString()}`);
  console.log(`  Landing page: /campaigns/${campaign.slug}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
