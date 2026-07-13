import mongoose from "mongoose";

// Products attached to a campaign, in display order. specialPrice is optional —
// when null the product sells at its regular (discounted) price; when set it
// must be below the current selling price (enforced in the admin controller,
// where the live product doc is available).
const campaignProductSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    specialPrice: { type: Number, min: 0, default: null },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.startDate || value > this.startDate;
        },
        message: "endDate must be later than startDate",
      },
    },
    // UPCOMING/RUNNING/ENDED are derived from the dates (see the `status`
    // virtual) so they can never go stale; only the manual cancel is stored.
    isCancelled: { type: Boolean, default: false },
    desktopBannerUrl: { type: String, required: true },
    mobileBannerUrl: { type: String, required: true },
    actionImageUrl: { type: String, default: "" },
    buttonLabel: { type: String, trim: true, maxlength: 50, default: "Shop Now" },
    themeColor: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^#([0-9a-f]{3}|[0-9a-f]{6})$/,
      default: "#dc2626",
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    products: { type: [campaignProductSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const CAMPAIGN_STATUS = {
  UPCOMING: "UPCOMING",
  RUNNING: "RUNNING",
  ENDED: "ENDED",
  CANCELLED: "CANCELLED",
};

export function deriveCampaignStatus(campaign, now = new Date()) {
  if (campaign.isCancelled) return CAMPAIGN_STATUS.CANCELLED;
  if (now < campaign.startDate) return CAMPAIGN_STATUS.UPCOMING;
  if (now > campaign.endDate) return CAMPAIGN_STATUS.ENDED;
  return CAMPAIGN_STATUS.RUNNING;
}

campaignSchema.virtual("status").get(function () {
  return deriveCampaignStatus(this);
});

campaignSchema.index({ isActive: 1, isCancelled: 1, startDate: 1, endDate: 1 });
campaignSchema.index({ "products.product": 1 });

export default mongoose.model("Campaign", campaignSchema);
