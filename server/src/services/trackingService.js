import Order from "../models/Order.js";
import { getProvider } from "../logistics/logisticsManager.js";
import { sendOrderStatusEmail } from "../utils/orderEmails.js";

const SHIPMENT_TO_ORDER_STATUS = {
  OUT_FOR_DELIVERY: "SHIPPED",
  DELIVERED: "DELIVERED",
};

const ORDER_STATUS_SEQUENCE = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];

function isForwardMove(fromStatus, toStatus) {
  const fromIndex = ORDER_STATUS_SEQUENCE.indexOf(fromStatus);
  const toIndex = ORDER_STATUS_SEQUENCE.indexOf(toStatus);
  return fromIndex !== -1 && toIndex !== -1 && toIndex > fromIndex;
}

export async function syncOrderStatus(shipment) {
  const nextOrderStatus = SHIPMENT_TO_ORDER_STATUS[shipment.status];
  if (!nextOrderStatus) return;

  const order = await Order.findById(shipment.orderId).populate("userId", "email");
  if (!order || !isForwardMove(order.status, nextOrderStatus)) return;

  order.status = nextOrderStatus;
  if (nextOrderStatus === "DELIVERED" && !order.deliveredAt) order.deliveredAt = new Date();
  await order.save();

  sendOrderStatusEmail(order, order.userId?.email, nextOrderStatus);
}

export async function refreshShipmentTracking(shipment) {
  const provider = getProvider(shipment.provider);
  const events = await provider.getTrackingEvents(shipment.providerShipmentId);
  const latest = events.at(-1);

  shipment.trackingEvents = events;
  if (latest) {
    shipment.status = latest.status;
    shipment.rawStatus = latest.rawStatus;
  }
  shipment.lastSyncedAt = new Date();
  await shipment.save();

  await syncOrderStatus(shipment);
  return shipment;
}

export async function recordTrackingEvent(shipment, { status, rawStatus, occurredAt, description }) {
  const isDuplicate = shipment.trackingEvents.some(
    (e) => e.rawStatus === rawStatus && e.occurredAt?.getTime() === occurredAt?.getTime()
  );
  if (isDuplicate) return shipment;

  shipment.trackingEvents.push({ status, rawStatus, occurredAt, description });
  shipment.status = status;
  shipment.rawStatus = rawStatus;
  shipment.lastSyncedAt = new Date();
  await shipment.save();

  await syncOrderStatus(shipment);
  return shipment;
}
