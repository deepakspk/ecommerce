// Pulse placeholder mirroring ProductCard's layout: square image, rating line,
// name lines, price, and the Add to Cart button.
export default function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-8 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
