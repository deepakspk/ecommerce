import { useContext } from "react";
import WishlistContext from "../context/WishlistContext";

export function useWishlist() {
  return useContext(WishlistContext);
}
