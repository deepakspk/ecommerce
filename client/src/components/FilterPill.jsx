export default function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white text-gray-700 border-gray-300 hover:border-brand-400"
      }`}
    >
      {label}
    </button>
  );
}
