import Order from "../models/Order.js";
import ReturnRequest from "../models/ReturnRequest.js";

const RETURN_WINDOW_DAYS = Number(process.env.RETURN_WINDOW_DAYS) || 7;
const ACTIVE_STATUSES = ["REQUESTED", "APPROVED", "PICKED_UP"];

export async function createReturnRequest(req, res) {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (order.status !== "DELIVERED") {
    return res.status(400).json({ message: "Only delivered orders are eligible for return" });
  }
  if (!order.deliveredAt) {
    return res.status(400).json({ message: "Delivery date is unavailable for this order" });
  }
  const windowEnds = new Date(order.deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  if (new Date() > windowEnds) {
    return res.status(400).json({ message: `The ${RETURN_WINDOW_DAYS}-day return window for this order has passed` });
  }

  const existing = await ReturnRequest.findOne({ orderId: order._id, status: { $in: ACTIVE_STATUSES } });
  if (existing) {
    return res.status(409).json({ message: "A return request is already in progress for this order" });
  }

  const { items } = req.body;
  const orderItemMap = new Map(order.items.map((i) => [String(i.variantId), i]));

  for (const item of items) {
    const orderItem = orderItemMap.get(item.variantId);
    if (!orderItem) {
      return res.status(400).json({ message: "One or more items do not belong to this order" });
    }
    if (item.quantity > orderItem.quantity) {
      return res.status(400).json({ message: `Cannot return more than ${orderItem.quantity} of ${orderItem.productName}` });
    }
  }

  const returnRequest = await ReturnRequest.create({
    orderId: order._id,
    userId: req.user._id,
    items,
  });

  res.status(201).json({ returnRequest });
}

export async function getMyReturnRequests(req, res) {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ message: "Order not found" });

  const returnRequests = await ReturnRequest.find({ orderId: order._id }).sort({ createdAt: -1 });
  res.json({ returnRequests });
}
