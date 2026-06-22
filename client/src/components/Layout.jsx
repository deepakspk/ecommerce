import Navbar from "./Navbar";
import CategoryNav from "./CategoryNav";
import Footer from "./Footer";
import TrustBadges from "./TrustBadges";
import { CONTAINER_CLASS } from "../utils/ui";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navbar />
      <CategoryNav />
      <main id="main-content" className="flex-1">{children}</main>
      <div className="border-t border-gray-200">
        <div className={CONTAINER_CLASS}>
          <TrustBadges />
        </div>
      </div>
      <Footer />
    </div>
  );
}
