import * as ncm from "../../config/ncm.js";

// NCM's rate-quote endpoint and its order-create endpoint each use their own vocabulary
// for the same four delivery types — this is the one canonical enum the rest of the app sees.
const RATE_TYPE_MAP = {
  DOOR_TO_DOOR: "Pickup/Collect",
  BRANCH_TO_DOOR: "Send",
  DOOR_TO_BRANCH: "D2B",
  BRANCH_TO_BRANCH: "B2B",
};

const CREATE_TYPE_MAP = {
  DOOR_TO_DOOR: "Door2Door",
  BRANCH_TO_DOOR: "Branch2Door",
  DOOR_TO_BRANCH: "Door2Branch",
  BRANCH_TO_BRANCH: "Branch2Branch",
};

const STATUS_MAP = {
  "Pickup Order Created": "BOOKED",
  "Drop off Order Created": "BOOKED",
  "Sent for Pickup": "BOOKED",
  "Pickup Complete": "PICKED_UP",
  Arrived: "IN_TRANSIT",
  "Sent for Delivery": "OUT_FOR_DELIVERY",
  Delivered: "DELIVERED",
};

function normalizeStatus(rawStatus) {
  return STATUS_MAP[rawStatus] || "IN_TRANSIT";
}

async function createShipment(shipment) {
  const { recipient, cod, fromBranch, toBranch, packageLabel, vendorRef, instruction, deliveryType, weight } =
    shipment;

  const payload = {
    name: recipient.name,
    phone: recipient.phone,
    phone2: recipient.phone2 || "",
    cod_charge: String(cod),
    address: recipient.address,
    fbranch: fromBranch,
    branch: toBranch,
    package: packageLabel,
    vref_id: "ecommerceREF",
    instruction,
    delivery_type: CREATE_TYPE_MAP[deliveryType] || CREATE_TYPE_MAP.DOOR_TO_DOOR,
    weight: weight ? String(weight) : undefined,
  };

  try {
    const data = await ncm.createOrder(payload);
    return { providerShipmentId: String(data.orderid), raw: data, sentPayload: payload };
  } catch (err) {
    err.sentPayload = payload;
    throw err;
  }
}

async function getShipmentStatus(providerShipmentId) {
  const events = await ncm.getOrderStatus(providerShipmentId);
  const latest = events[0];
  return { status: normalizeStatus(latest?.status), rawStatus: latest?.status, occurredAt: latest?.added_time };
}

async function getTrackingEvents(providerShipmentId) {
  const events = await ncm.getOrderStatus(providerShipmentId);
  return events
    .map((e) => ({ status: normalizeStatus(e.status), rawStatus: e.status, occurredAt: e.added_time }))
    .reverse(); // NCM returns newest-first; the rest of the app wants chronological order
}

async function returnShipment(providerShipmentId, reason) {
  return ncm.markVendorReturn(Number(providerShipmentId), reason);
}

async function getLabel(providerShipmentId) {
  const { labels = [], not_found = [] } = await ncm.getOrderLabel([Number(providerShipmentId)]);
  const label = labels.find((item) => String(item.orderid) === String(providerShipmentId)) || labels[0];

  if (!label) {
    const err = new Error(
      not_found.includes(Number(providerShipmentId))
        ? "NCM has not generated a label for this order yet — try again shortly"
        : "Label not found for this shipment"
    );
    err.status = 404;
    throw err;
  }

  return label;
}

async function calculateRate({ fromBranch, toBranch, deliveryType }) {
  return ncm.getShippingRate({
    creation: fromBranch,
    destination: toBranch,
    type: RATE_TYPE_MAP[deliveryType] || RATE_TYPE_MAP.DOOR_TO_DOOR,
  });
}

async function listBranches() {
  return ncm.getBranches();
}

async function addComment(providerShipmentId, message) {
  return ncm.createComment(providerShipmentId, message);
}

function isConfigured() {
  return Boolean(process.env.NCM_API_TOKEN);
}

export default {
  code: "NCM",
  label: "Nepal Can Move",
  capabilities: {
    createShipment: true,
    cancelShipment: false,
    returnShipment: true,
    rateCalculation: true,
    branchResolution: true,
    comments: true,
    labelPrinting: true,
  },
  isConfigured,
  createShipment,
  getShipmentStatus,
  getTrackingEvents,
  returnShipment,
  calculateRate,
  listBranches,
  addComment,
  getLabel,
  normalizeStatus,
};
