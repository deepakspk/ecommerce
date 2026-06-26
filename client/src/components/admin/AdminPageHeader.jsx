export default function AdminPageHeader({ title, subtitle, loading, action }) {
  return (
    <div
      className="rounded-xl px-5 py-6 mb-6 flex items-center justify-between gap-4 shadow-sm"
      style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3561 100%)" }}
    >
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {loading ? (
          <div className="h-4 w-28 bg-white/15 rounded mt-2 animate-pulse" />
        ) : subtitle ? (
          <p className="text-sm text-blue-200 mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
