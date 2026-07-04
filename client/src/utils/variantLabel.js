// A variant that doesn't vary by size (or by color) stores the literal string
// "Default" for that dimension (see server/src/models/ProductVariant.js and the
// admin product/variant controllers). That's an internal bookkeeping value, not
// something a shopper or admin reviewing an order should see rendered verbatim —
// build any "{size} / {color}" line-item label through this helper instead of
// interpolating the raw fields directly.
export const DEFAULT_VARIANT_VALUE = "Default";

export function variantLabel({ size, color } = {}, separator = " · ") {
  return [size, color].filter((v) => v && v !== DEFAULT_VARIANT_VALUE).join(separator);
}
