import Order from "../../models/Order.js";
import Shipment from "../../models/Shipment.js";
import { getProvider, listProviders } from "../../logistics/logisticsManager.js";
import { refreshShipmentTracking } from "../../services/trackingService.js";

function requireCapability(provider, capability) {
  if (!provider.capabilities[capability]) {
    const err = new Error(`${provider.label} does not support ${capability}`);
    err.status = 400;
    throw err;
  }
}

export async function getProviders(req, res) {
  res.json({ providers: listProviders() });
}

export async function getProviderBranches(req, res) {
  const provider = getProvider(req.params.code);
  requireCapability(provider, "branchResolution");
  const branches = await provider.listBranches();
  res.json({ branches });
}

export async function getRatePreview(req, res) {
  const provider = getProvider(req.params.code);
  requireCapability(provider, "rateCalculation");
  const rate = await provider.calculateRate(req.body);
  res.json({ rate });
}

export async function createShipment(req, res) {
  const { provider: providerCode, toBranch, packageLabel, instruction, deliveryType, weight } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const existing = await Shipment.findOne({ orderId: order._id });
  if (existing) return res.status(400).json({ message: "This order already has a shipment" });

  const provider = getProvider(providerCode);

  const shipmentRequest = {
    recipient: {
      name: order.address.recipientName,
      phone: order.address.phone,
      address: [order.address.street, order.address.area, order.address.city, order.address.district]
        .filter(Boolean)
        .join(", "),
    },
    cod: order.paymentMethod === "COD" ? order.total : 0,
    fromBranch: process.env.NCM_PICKUP_BRANCH,
    toBranch,
    packageLabel: packageLabel || `Order ${order._id}`,
    vendorRef: String(order._id),
    instruction,
    deliveryType: deliveryType || "DOOR_TO_DOOR",
    weight,
  };

  let providerShipmentId, raw, sentPayload;
  try {
    ({ providerShipmentId, raw, sentPayload } = await provider.createShipment(shipmentRequest));
  } catch (err) {
    console.error("Shipment creation failed:", err.message, err.sentPayload || shipmentRequest);
    return res.status(err.status || 502).json({
      message: err.message,
      debugParams: err.sentPayload || shipmentRequest,
    });
  }

  const shipment = await Shipment.create({
    orderId: order._id,
    provider: provider.code,
    providerShipmentId,
    fromBranch: process.env.NCM_PICKUP_BRANCH,
    toBranch,
    codCharge: order.paymentMethod === "COD" ? order.total : 0,
    meta: raw,
  });

  res.status(201).json({ shipment, debugParams: sentPayload || shipmentRequest });
}

export async function getShipmentForOrder(req, res) {
  const shipment = await Shipment.findOne({ orderId: req.params.id });
  if (!shipment) return res.status(404).json({ message: "No shipment for this order" });
  res.json({ shipment });
}

export async function refreshShipment(req, res) {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });

  await refreshShipmentTracking(shipment);
  res.json({ shipment });
}

export async function getShipmentLabel(req, res) {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });

  const provider = getProvider(shipment.provider);
  requireCapability(provider, "labelPrinting");

  const label = await provider.getLabel(shipment.providerShipmentId);
  res.json({ label });
}

export async function returnShipment(req, res) {
  const { reason } = req.body;
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) return res.status(404).json({ message: "Shipment not found" });

  const provider = getProvider(shipment.provider);
  requireCapability(provider, "returnShipment");

  await provider.returnShipment(shipment.providerShipmentId, reason);
  shipment.status = "RETURNED";
  await shipment.save();

  res.json({ shipment });
}
