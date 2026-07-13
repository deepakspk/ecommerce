import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import * as campaignsApi from "../api/campaigns";
import { cloudinaryUrl } from "../utils/cloudinaryUrl";
import ProductCard from "../components/ProductCard";
import CountdownTimer from "../components/CountdownTimer";
import EmptyState from "../components/EmptyState";
import Seo from "../components/Seo";
import { PAGE_CLASS } from "../utils/ui";

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampaignPage() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Bumped when the countdown expires so prices refresh to match what
  // checkout now charges (upcoming → running, or running → ended).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    campaignsApi.getCampaignBySlug(slug)
      .then(({ campaign: data }) => {
        if (!active) return;
        setCampaign(data);
        setNotFound(false);
      })
      .catch(() => { if (active) setNotFound(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, reloadKey]);

  // Navigating between two campaign pages reuses this component instance, so
  // treat a campaign from the previous slug as still-loading.
  const stale = campaign && campaign.slug !== slug;

  if (loading || stale) {
    return (
      <div className={PAGE_CLASS}>
        <div className="animate-pulse space-y-6">
          <div className="h-48 sm:h-72 bg-gray-200 rounded-2xl" />
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !campaign) {
    return (
      <div className={PAGE_CLASS}>
        <EmptyState
          title="Campaign not found"
          message="This campaign doesn't exist or is no longer available."
          action={
            <Link to="/" className="text-sm text-brand-600 hover:underline font-medium">
              Back to home
            </Link>
          }
        />
      </div>
    );
  }

  const color = campaign.themeColor || "#dc2626";
  const isUpcoming = campaign.status === "UPCOMING";
  const isRunning = campaign.status === "RUNNING";
  const isEnded = campaign.status === "ENDED";

  return (
    <div className={PAGE_CLASS}>
      <Seo title={campaign.name} description={campaign.description || `${campaign.name} — limited time deals`} />

      {/* Campaign banner — desktop (1200×400) on sm+, mobile (600×800) below */}
      <div className="rounded-2xl overflow-hidden bg-gray-100 mb-6">
        <img
          src={cloudinaryUrl(campaign.desktopBannerUrl, 1400)}
          alt={campaign.name}
          className="hidden sm:block w-full h-auto"
        />
        <img
          src={cloudinaryUrl(campaign.mobileBannerUrl, 800)}
          alt={campaign.name}
          className="sm:hidden w-full h-auto"
        />
      </div>

      {/* Status bar: title + countdown / ended notice */}
      <div
        className="rounded-2xl p-4 sm:p-5 mb-6 flex items-center gap-4 flex-wrap"
        style={{ backgroundColor: `${color}0d` }}
      >
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{campaign.name}</h1>
          {campaign.description && <p className="text-sm text-gray-600 mt-0.5">{campaign.description}</p>}
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDateTime(campaign.startDate)} – {formatDateTime(campaign.endDate)}
          </p>
        </div>
        <div className="ml-auto">
          {isEnded ? (
            <span className="inline-block bg-gray-200 text-gray-600 text-sm font-semibold rounded-full px-4 py-1.5">
              This campaign has ended
            </span>
          ) : (
            <div>
              <p className="text-[10px] font-bold text-gray-500 tracking-widest text-center mb-1">
                {isUpcoming ? "STARTS IN" : "ENDS IN"}
              </p>
              <CountdownTimer
                target={isUpcoming ? campaign.startDate : campaign.endDate}
                onExpire={() => setReloadKey((k) => k + 1)}
              />
            </div>
          )}
        </div>
      </div>

      {isUpcoming && (
        <p className="text-sm text-gray-500 mb-4">
          Deal prices unlock when the campaign starts — here's what will be on sale:
        </p>
      )}

      {campaign.products.length === 0 ? (
        <EmptyState
          title="No products in this campaign yet"
          message="Check back soon — deals are on the way."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {campaign.products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {isRunning && (
        <p className="text-xs text-gray-400 mt-6">
          Campaign prices apply automatically in your cart and at checkout while the campaign is live.
        </p>
      )}
    </div>
  );
}
