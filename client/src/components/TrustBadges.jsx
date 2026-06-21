const ITEMS = [
  {
    label: "Pan-Nepal Delivery",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 0h-12" />
      </svg>
    ),
  },
  {
    label: "Cash on Delivery",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="3" y="7" width="18" height="10" rx="1.5" />
        <circle cx="12" cy="12" r="2.25" />
        <path strokeLinecap="round" d="M6.5 9.5h-.01M17.5 14.5h.01" />
      </svg>
    ),
  },
  {
    label: "7-Day Easy Returns",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15a8 8 0 0 0 14.5 3.5M19.5 9A8 8 0 0 0 5 5.5" />
      </svg>
    ),
  },
  {
    label: "Secure Checkout",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2.25 2.25L15.5 9.5" />
      </svg>
    ),
  },
];

export default function TrustBadges({ className = "", compact = false }) {
  return (
    <div className={`grid grid-cols-2 ${compact ? "" : "sm:grid-cols-4"} gap-4 ${className}`}>
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5 text-sm text-gray-700">
          <span className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
            {item.icon}
          </span>
          <span className="font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
