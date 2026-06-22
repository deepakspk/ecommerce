import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useThemeSettings } from "../hooks/useThemeSettings";
import { CONTAINER_CLASS } from "../utils/ui";

const SKELETON_WIDTHS = ["w-16", "w-20", "w-14", "w-24", "w-16", "w-20"];

function ChevronRight({ rotateOnOpen = false }) {
  return (
    <svg
      className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${rotateOnOpen ? "cat-chevron-below" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// Renders a flyout panel of items; any item with its own children gets a right
// arrow and recurses into another flyout that opens to the right on hover.
function CategorySubmenu({ items, align = "right" }) {
  const panelClass = align === "below" ? "left-0 top-full rounded-xl" : "left-full top-0 -ml-px rounded-xl cat-flyout-right";
  return (
    <div className={`cat-flyout absolute ${panelClass} bg-white border border-gray-100 shadow-xl ring-1 ring-black/5 min-w-[220px] py-1.5 z-30`}>
      {items.map((item) => (
        <div key={item.id} className={item.children.length > 0 ? "cat-trigger" : undefined}>
          <Link
            to={`/products?category=${item.slug}`}
            className="flex items-center gap-2 mx-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-600 transition-colors duration-150 whitespace-nowrap"
          >
            <span className="flex-1">{item.name}</span>
            {item.children.length > 0 && <ChevronRight />}
          </Link>
          {item.children.length > 0 && <CategorySubmenu items={item.children} />}
        </div>
      ))}
    </div>
  );
}

export default function CategoryNav() {
  const { categories, loading: categoriesLoading } = useCategories();
  const { loading: themeLoading } = useThemeSettings();

  if (categoriesLoading || themeLoading) {
    return (
      <nav className="hidden sm:block border-b border-gray-200 bg-white relative z-20">
        <ul className={`${CONTAINER_CLASS} flex items-stretch flex-wrap gap-1`}>
          {SKELETON_WIDTHS.map((w, i) => (
            <li key={i} className="px-3 py-2.5">
              <div className={`h-4 ${w} bg-gray-200 rounded animate-pulse`} />
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  if (categories.length === 0) return null;

  return (
    <nav className="hidden sm:block border-b border-gray-200 bg-white relative z-20">
      <ul className={`${CONTAINER_CLASS} flex items-stretch flex-wrap gap-1 py-1`}>
        {categories.map((cat) => (
          <li key={cat.id} className={`flex-shrink-0 ${cat.children.length > 0 ? "cat-trigger" : ""}`}>
            <Link
              to={`/products?category=${cat.slug}`}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors duration-150 whitespace-nowrap"
            >
              {cat.name}
              {cat.children.length > 0 && <ChevronRight rotateOnOpen />}
            </Link>

            {cat.children.length > 0 && <CategorySubmenu items={cat.children} align="below" />}
          </li>
        ))}
      </ul>
    </nav>
  );
}
