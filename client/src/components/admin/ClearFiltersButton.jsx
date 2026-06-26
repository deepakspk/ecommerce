export default function ClearFiltersButton({ show, onClick }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors whitespace-nowrap"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
      Clear filters
    </button>
  );
}
