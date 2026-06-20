export default function EmptyState({ title, message, action }) {
  return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-lg mb-2">{title}</p>
      {message && <p className="text-sm mb-2">{message}</p>}
      {action}
    </div>
  );
}
