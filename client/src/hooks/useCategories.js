import { useContext } from "react";
import CategoriesContext from "../context/CategoriesContext";

export function useCategories() {
  return useContext(CategoriesContext);
}
