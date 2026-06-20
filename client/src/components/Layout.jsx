import Navbar from "./Navbar";
import CategoryNav from "./CategoryNav";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <CategoryNav />
      <main>{children}</main>
    </div>
  );
}
