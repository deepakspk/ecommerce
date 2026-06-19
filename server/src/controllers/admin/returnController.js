import mongoose from "mongoose";
import ReturnRequest from "../../models/ReturnRequest.js";
import Order from "../../models/Order.js";
import Payment from "../../models/Payment.js";
import { sendReturnStatusEmail } from "../../utils/orderEmails.js";

const STATUS_TRANSITIONS = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PICKED_UP"],
  PICKED_UP: ["REFUNDED"],
  REJECTED: [],
  REFUNDED: [],
};

export async function listReturns(req, res) {
  const { status, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [returns, total] = await Promise.all([
    ReturnRequest.find(filter)
      .populate("userId", "name email")
      .populate("orderId", "total status createdAt")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    ReturnRequest.countDocuments(filter),
  ]);

  res.json({ returns, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function getReturn(req, res) {
  const returnRequest = await ReturnRequest.findById(req.params.id)
    .populate("userId", "name email phone")
    .populate("orderId");
  if (!returnRequest) return res.status(404).json({ message: "Return request not found" });
  res.json({ returnRequest });
}

export async function updateReturnStatus(req, res) {
  const { status, adminNote } = req.body;
  const returnRequest = await ReturnRequest.findById(req.params.id).populate("userId", "name email phone");
  if (!returnRequest) return res.status(404).json({ message: "Return request not found" });

  const allowed = STATUS_TRANSITIONS[returnRequest.status] ?? [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      message: `Cannot move from ${returnRequest.status} to ${status}. Allowed next: ${allowed.join(", ") || "none"}`,
    });
  }

  if (status !== "REFUNDED") {
    returnRequest.status = status;
    if (adminNote !== undefined) returnRequest.adminNote = adminNote;
    await returnRequest.save();
    sendReturnStatusEmail(returnRequest, returnRequest.userId?.email, status);
    return res.json({ returnRequest });
  }

  // Refund: stamp the parent order and log a manual Payment record in the same transaction.
  const order = await Order.findById(returnRequest.orderId);
  if (!order) return res.status(404).json({ message: "Parent order not found" });

  const orderItemMap = new Map(order.items.map((i) => [String(i.variantId), i]));
  const refundAmount = returnRequest.items.reduce((sum, item) => {
    const orderItem = orderItemMap.get(String(item.variantId));
    return sum + (orderItem ? orderItem.unitPrice * item.quantity : 0);
  }, 0);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    order.paymentStatus = "REFUNDED";
    await order.save({ session });

    await Payment.create(
      [{
        orderId: order._id,
        gateway: order.paymentMethod,
        amount: refundAmount,
        status: "REFUNDED",
        rawResponse: { note: "Manual refund logged by admin", returnRequestId: returnRequest._id },
      }],
      { session }
    );

    returnRequest.status = "REFUNDED";
    if (adminNote !== undefined) returnRequest.adminNote = adminNote;
    await returnRequest.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }

  res.json({ returnRequest });
}
