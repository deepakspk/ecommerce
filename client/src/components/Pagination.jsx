// Always shows first, last, and a small window around the current page, collapsing
// any gap into a single "…" so this stays usable even with 50+ pages.
function getPageItems(current, total) {
  const delta = 1;
  const middle = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    middle.push(i);
  }
  const pages = [...new Set([1, ...middle, total])];

  const items = [];
  let prev;
  for (const p of pages) {
    if (prev !== undefined) {
      if (p - prev === 2) items.push(prev + 1);
      else if (p - prev > 2) items.push("ellipsis-" + p);
    }
    items.push(p);
    prev = p;
  }
  return items;
}

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-10">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-md text-sm disabled:opacity-40 hover:border-brand-400 transition-colors"
      >
        Previous
      </button>

      {getPageItems(page, pages).map((item) =>
        typeof item === "number" ? (
          <button
            key={item}
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
              item === page ? "bg-brand-600 text-white" : "border border-gray-300 dark:border-gray-600 dark:text-gray-200 hover:border-brand-400"
            }`}
          >
            {item}
          </button>
        ) : (
          <span key={item} className="w-8 h-8 flex items-center justify-center text-sm text-gray-400">
            …
          </span>
        )
      )}

      <button
        onClick={() => onChange(Math.min(pages, page + 1))}
        disabled={page === pages}
        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-md text-sm disabled:opacity-40 hover:border-brand-400 transition-colors"
      >
        Next
      </button>
    </div>
  );
}
