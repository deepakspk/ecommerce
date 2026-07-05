import { useState, useEffect } from "react";
import * as productsApi from "../api/products";
import * as featureTypesApi from "../api/featureTypes";
import ProductRail from "./ProductRail";

const RAIL_LIMIT = 10;

export default function FeatureRails() {
  const [rails, setRails] = useState([]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      let featureTypes = [];
      try {
        const d = await featureTypesApi.getActiveFeatureTypes();
        featureTypes = d.featureTypes;
      } catch {
        return;
      }
      if (ignore || featureTypes.length === 0) return;

      const results = await Promise.all(
        featureTypes.map((ft) =>
          productsApi
            .getProducts({ featureType: ft.slug, limit: RAIL_LIMIT, sort: "newest" })
            .then((d) => ({ featureType: ft, products: d.products }))
            .catch(() => ({ featureType: ft, products: [] }))
        )
      );
      if (!ignore) setRails(results.filter((r) => r.products.length > 0));
    }
    load();
    return () => { ignore = true; };
  }, []);

  if (rails.length === 0) return null;

  return (
    <div className="space-y-8">
      {rails.map(({ featureType, products }) => (
        <ProductRail key={featureType._id} title={featureType.name} products={products} layout="scroll" />
      ))}
    </div>
  );
}
