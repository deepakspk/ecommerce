import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="text-center py-24">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Page not found</h1>
      <Link to="/" className="text-blue-600 hover:underline text-sm">
        Go home
      </Link>
    </div>
  );
}
