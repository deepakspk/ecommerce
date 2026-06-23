import AddressBook from "../components/AddressBook";
import { H1_CLASS } from "../utils/ui";

export default function AddressesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className={`${H1_CLASS} mb-6`}>Saved Addresses</h1>
      <AddressBook />
    </div>
  );
}
