import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as campaignsApi from "../api/campaigns";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";
import ProductCard from "./ProductCard";
import CountdownTimer from "./CountdownTimer";

// "#f00"/"#ff0000" -> "#ff0000" + alpha byte, for the section's soft tint
function hexWithAlpha(hex, alpha) {
  let value = (hex || "#dc2626").replace("#", "");
  if (value.length === 3) value = value.split("").map((c) => c + c).join("");
  return `#${value}${alpha}`;
}

function ClockIcon({ color }) {
  return (
    <svg className="w-7 h-7" fill="none" stroke={color} strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function CampaignSection({ campaign, onExpire }) {
  const color = campaign.themeColor || "#dc2626";
  const moreCount = campaign.productCount - campaign.products.length;

  return (
    <section
      aria-label={campaign.name}
      className="rounded-2xl p-4 sm:p-6"
      style={{ backgroundColor: hexWithAlpha(color, "0d") }}
    >
      {/* Header: icon + name + countdown + CTA */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: hexWithAlpha(color, "1a") }}
        >
          {campaign.actionImageUrl ? (
            <img
              src={cloudinaryUrl(campaign.actionImageUrl, 120)}
              alt=""
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain"
            />
          ) : (
            <ClockIcon color={color} />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 truncate">{campaign.name}</h2>
            <span className="bg-yellow-400 text-gray-900 text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 flex-shrink-0">
              Hot
            </span>
          </div>
          <p className="text-sm text-gray-500">Hurry up! Limited time offers</p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 ml-auto flex-wrap">
          <div>
            <p className="text-[10px] font-bold text-gray-500 tracking-widest text-center mb-1">ENDS IN</p>
            <CountdownTimer target={campaign.endDate} accentColor={color} onExpire={onExpire} />
          </div>
          <Link
            to={`/campaigns/${campaign.slug}`}
            className="inline-flex items-center gap-1.5 text-white text-sm font-semibold rounded-lg px-4 sm:px-5 py-2.5 shadow-sm hover:opacity-90 transition-opacity flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {campaign.buttonLabel || "Shop Now"}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="border-t border-gray-200/70 my-4" />

      {/* Product rail — first 10 campaign products, horizontally scrollable */}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {campaign.products.map((product) => (
          <div key={product._id} className="w-44 sm:w-52 flex-shrink-0">
            <ProductCard product={product} />
          </div>
        ))}
        {moreCount > 0 && (
          <Link
            to={`/campaigns/${campaign.slug}`}
            className="w-44 sm:w-52 flex-shrink-0 rounded-2xl border-2 border-dashed border-gray-300 bg-white/60 flex flex-col items-center justify-center gap-2 text-center p-4 hover:border-gray-400 transition-colors"
          >
            <span className="text-2xl font-extrabold" style={{ color }}>+{moreCount}</span>
            <span className="text-sm font-medium text-gray-600">more deals</span>
            <span className="text-xs font-semibold" style={{ color }}>View All →</span>
          </Link>
        )}
      </div>
    </section>
  );
}

// Home screen campaign sections: every running, storefront-visible campaign
// with at least one product, in the admin's drag-sorted order.
export default function HomeCampaigns() {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    let ignore = false;
    campaignsApi.getHomeCampaigns()
      .then(({ campaigns: data }) => { if (!ignore) setCampaigns(data); })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  if (campaigns.length === 0) return null;

  return (
    <div className="space-y-8">
      {campaigns.map((campaign) => (
        <CampaignSection
          key={campaign._id}
          campaign={campaign}
          // The sale is over the moment the countdown hits zero — drop the section
          onExpire={() => setCampaigns((prev) => prev.filter((c) => c._id !== campaign._id))}
        />
      ))}
    </div>
  );
}
