import Campaign, { deriveCampaignStatus } from "../models/Campaign.js";
import Product from "../models/Product.js";
import { runningCampaignFilter } from "../services/campaignService.js";
import { presentProducts } from "../services/productPresenter.js";

const HOME_PRODUCT_LIMIT = 10;

// Hydrates a campaign's ordered product list into storefront-ready cards.
// Inactive/deleted products silently drop out; the campaign's array order is
// preserved (it's the display order the admin arranged).
async function hydrateCampaignProducts(campaign, limit) {
  const entries = limit ? campaign.products.slice(0, limit) : campaign.products;
  const ids = entries.map((e) => e.product);
  const docs = await Product.find({ _id: { $in: ids }, isActive: true }).populate(
    "categories",
    "name slug"
  );
  const presented = await presentProducts(docs);
  const byId = new Map(presented.map((p) => [String(p._id), p]));
  return entries.map((e) => byId.get(String(e.product))).filter(Boolean);
}

function publicCampaignFields(campaign) {
  return {
    _id: campaign._id,
    name: campaign.name,
    slug: campaign.slug,
    description: campaign.description,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    status: deriveCampaignStatus(campaign),
    desktopBannerUrl: campaign.desktopBannerUrl,
    mobileBannerUrl: campaign.mobileBannerUrl,
    actionImageUrl: campaign.actionImageUrl,
    buttonLabel: campaign.buttonLabel,
    themeColor: campaign.themeColor,
  };
}

// Home screen: running campaigns only, each with its first 10 products.
// productCount lets the client decide whether to render a "view more" card.
export async function getHomeCampaigns(req, res) {
  const campaigns = await Campaign.find(runningCampaignFilter()).sort({ sortOrder: 1, createdAt: -1 });

  const payload = await Promise.all(
    campaigns.map(async (campaign) => {
      const products = await hydrateCampaignProducts(campaign, HOME_PRODUCT_LIMIT);
      return {
        ...publicCampaignFields(campaign),
        products,
        productCount: campaign.products.length,
      };
    })
  );

  // A campaign whose products all went inactive has nothing to sell — skip it
  res.json({ campaigns: payload.filter((c) => c.products.length > 0) });
}

// Landing page: reachable for upcoming/running/ended campaigns (the client
// renders "starts in" / countdown / "ended" accordingly). Cancelled or
// deactivated campaigns 404 — they should disappear from the storefront.
export async function getCampaignBySlug(req, res) {
  const campaign = await Campaign.findOne({
    slug: req.params.slug.toLowerCase(),
    isActive: true,
    isCancelled: false,
  });
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const products = await hydrateCampaignProducts(campaign);

  res.json({
    campaign: {
      ...publicCampaignFields(campaign),
      products,
      productCount: products.length,
    },
  });
}
