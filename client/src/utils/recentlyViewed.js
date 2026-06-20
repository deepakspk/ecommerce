const STORAGE_KEY = "ecommerce_recently_viewed";
const MAX_ENTRIES = 10;

export function getRecentlyViewedSlugs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(slug) {
  const next = [slug, ...getRecentlyViewedSlugs().filter((s) => s !== slug)].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
