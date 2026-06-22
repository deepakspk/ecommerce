import { useEffect, useState } from "react";
import CategoriesContext from "./CategoriesContext";
import * as categoriesApi from "../api/categories";

// Fetched once at app root and shared by CategoryNav, the mobile menu, Footer, and
// ProductsPage so the category tree isn't requested 3-4 times on every page load.
export default function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoriesApi.getCategoryTree()
      .then((d) => setCategories(d.tree))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CategoriesContext.Provider value={{ categories, loading }}>
      {children}
    </CategoriesContext.Provider>
  );
}
