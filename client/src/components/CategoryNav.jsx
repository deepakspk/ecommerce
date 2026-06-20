import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as categoriesApi from "../api/categories";

export default function CategoryNav() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    categoriesApi.getCategoryTree()
      .then((d) => setCategories(d.tree))
      .catch(() => setCategories([]));
  }, []);

  if (categories.length === 0) return null;

  return (
    <nav className="hidden sm:block border-b border-gray-200 bg-white relative z-20">
      <ul className="flex items-stretch gap-1 px-4 overflow-x-auto">
        {categories.map((cat) => (
          <li key={cat.id} className="group relative flex-shrink-0">
            <Link
              to={`/products?category=${cat.slug}`}
              className="flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-brand-600 whitespace-nowrap"
            >
              {cat.name}
              {cat.children.length > 0 && (
                <svg className="w-3 h-3 text-gray-400 group-hover:text-brand-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </Link>

            {cat.children.length > 0 && (
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity absolute left-0 top-full bg-white border border-gray-200 rounded-b-lg shadow-lg min-w-[220px] py-2 z-30">
                {cat.children.map((child) => (
                  <Link
                    key={child.id}
                    to={`/products?category=${child.slug}`}
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-600"
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
