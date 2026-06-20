import { BADGE_BASE, ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS, RETURN_STATUS_COLORS, SHIPMENT_STATUS_COLORS } from "../utils/ui";

const COLOR_MAPS = {
  order: ORDER_STATUS_COLORS,
  payment: PAYMENT_STATUS_COLORS,
  return: RETURN_STATUS_COLORS,
  shipment: SHIPMENT_STATUS_COLORS,
};

export default function Badge({ kind, status }) {
  const colors = COLOR_MAPS[kind]?.[status] || "bg-gray-100 text-gray-600";
  return <span className={`${BADGE_BASE} ${colors}`}>{status.replace(/_/g, " ")}</span>;
}
