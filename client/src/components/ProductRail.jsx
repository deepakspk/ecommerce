import ProductCard from "./ProductCard";

export default function ProductRail({ title, products, layout = "scroll" }) {
  if (!products || products.length === 0) return null;
  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {layout === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {products.map((product) => (
            <div key={product._id} className="w-40 sm:w-48 flex-shrink-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
