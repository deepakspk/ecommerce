export default function EmptyState({ title, message, action }) {
  return (
    <div className="text-center py-20">
      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25M21 7.5v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9.75v9.75" />
      </svg>
      <p className="text-lg text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      {message && <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
