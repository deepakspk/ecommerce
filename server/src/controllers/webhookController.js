import Shipment from "../models/Shipment.js";
import ncmProvider from "../logistics/providers/ncmProvider.js";
import { recordTrackingEvent } from "../services/trackingService.js";
import * as settingsService from "../services/settingsService.js";

export async function handleNcmWebhook(req, res) {
  console.log("[ncm-webhook] received:", JSON.stringify(req.body));

  const secret = settingsService.get("LOGISTICS_WEBHOOK_SECRET");
  if (!secret || req.query.token !== secret) {
    console.error("[ncm-webhook] rejected: invalid or missing token");
    return res.status(401).json({ message: "Invalid webhook token" });
  }

  if (req.body.test) {
    console.log("[ncm-webhook] test payload acknowledged");
    return res.json({ received: true });
  }

  const { order_id, order_ids, status, event, timestamp } = req.body;
  const ncmOrderIds = order_ids ?? (order_id ? [order_id] : []);
  const occurredAt = timestamp ? new Date(timestamp) : new Date();

  for (const ncmOrderId of ncmOrderIds) {
    const shipment = await Shipment.findOne({ provider: "NCM", providerShipmentId: String(ncmOrderId) });
    if (!shipment) {
      console.error(`[ncm-webhook] no shipment found for NCM order id ${ncmOrderId}`);
      continue;
    }

    try {
      const normalized = ncmProvider.normalizeStatus(status);
      await recordTrackingEvent(shipment, { status: normalized, rawStatus: status, occurredAt, description: event });
      console.log(
        `[ncm-webhook] shipment ${shipment._id} (order ${shipment.orderId}) -> ${normalized} (raw: "${status}", event: ${event})`
      );
    } catch (err) {
      console.error(`[ncm-webhook] failed to apply update for shipment ${shipment._id}:`, err.message);
    }
  }

  res.json({ received: true });
}
