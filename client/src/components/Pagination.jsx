export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex justify-center gap-2 mt-10">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-40 hover:border-brand-400 transition-colors"
      >
        Previous
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
            p === page ? "bg-brand-600 text-white" : "border border-gray-300 hover:border-brand-400"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(pages, page + 1))}
        disabled={page === pages}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-40 hover:border-brand-400 transition-colors"
      >
        Next
      </button>
    </div>
  );
}
