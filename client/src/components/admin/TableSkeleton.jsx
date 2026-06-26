import { CARD_CLASS } from "../../utils/ui";

// Bar widths cycle per column so a row of skeleton cells doesn't look like a
// uniform grid of identical blocks — mimics how real content (names vs badges
// vs short numbers) varies in width.
const WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-1/3", "w-1/2", "w-3/5", "w-2/5"];

export default function TableSkeleton({ columns = 5, rows = 10 }) {
  return (
    <div className={`${CARD_CLASS} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: columns }).map((_, c) => (
                  <td key={c} className="px-5 py-4">
                    <div className={`h-4 ${WIDTHS[(c + r) % WIDTHS.length]} bg-gray-200 rounded animate-pulse`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
