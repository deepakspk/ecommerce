// Shared design tokens — see UI_STYLE_GUIDE.md. Reuse these instead of inlining
// the same border/radius/color values on a new page.

export const INPUT_CLASS =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
export const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

export const BUTTON_PRIMARY =
  "bg-brand-600 text-white rounded-md py-2 px-4 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
export const BUTTON_PRIMARY_FULL = `w-full ${BUTTON_PRIMARY}`;
export const BUTTON_SECONDARY =
  "bg-white text-gray-700 border border-gray-300 rounded-md py-2 px-4 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
export const BUTTON_DANGER =
  "bg-red-600 text-white rounded-md py-2 px-4 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
export const BUTTON_GHOST =
  "text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors";

export const CARD_CLASS = "bg-white border border-gray-200 rounded-lg";
export const PAGE_CLASS = "max-w-7xl mx-auto px-4 sm:px-8 py-6";

export const H1_CLASS = "text-2xl font-bold text-gray-900";
export const SECTION_HEADING_CLASS = "text-lg font-semibold text-gray-900";
export const MUTED_CLASS = "text-xs text-gray-500";

export const BADGE_BASE = "inline-block text-xs font-semibold px-2 py-0.5 rounded-full";

export const ORDER_STATUS_COLORS = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PACKED: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-brand-100 text-brand-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

export const PAYMENT_STATUS_COLORS = {
  PENDING: "bg-gray-100 text-gray-600",
  PAID: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-600",
  REFUNDED: "bg-amber-100 text-amber-700",
};

export const RETURN_STATUS_COLORS = {
  REQUESTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-indigo-100 text-indigo-700",
  REJECTED: "bg-red-100 text-red-600",
  PICKED_UP: "bg-brand-100 text-brand-700",
  REFUNDED: "bg-green-100 text-green-700",
};

export const SHIPMENT_STATUS_COLORS = {
  BOOKED: "bg-amber-100 text-amber-700",
  PICKED_UP: "bg-brand-100 text-brand-700",
  IN_TRANSIT: "bg-indigo-100 text-indigo-700",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  RETURNED: "bg-orange-100 text-orange-700",
  CANCELLED: "bg-red-100 text-red-600",
  FAILED: "bg-red-100 text-red-600",
};
