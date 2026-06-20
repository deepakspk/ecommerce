import { useState, useEffect } from "react";
import * as productsApi from "../api/products";
import { getRecentlyViewedSlugs } from "../utils/recentlyViewed";
import ProductRail from "./ProductRail";

export default function RecentlyViewedRail({ excludeSlug }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const slugs = getRecentlyViewedSlugs().filter((s) => s !== excludeSlug);
      if (slugs.length === 0) {
        if (!ignore) setProducts([]);
        return;
      }
      const results = await Promise.all(
        slugs.map((slug) => productsApi.getProduct(slug).then((d) => d.product).catch(() => null))
      );
      if (!ignore) setProducts(results.filter(Boolean));
    }
    load();
    return () => { ignore = true; };
  }, [excludeSlug]);

  return <ProductRail title="Recently viewed" products={products} />;
}
