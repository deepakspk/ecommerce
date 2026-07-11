import ContactMessage from "../../models/ContactMessage.js";

export async function listContactMessages(req, res) {
  const { status, search, from, to, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (search?.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { email: re }, { phone: re }, { message: re }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [messages, total, newCount] = await Promise.all([
    ContactMessage.find(filter)
      .populate("userId", "name email")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    ContactMessage.countDocuments(filter),
    ContactMessage.countDocuments({ status: "NEW" }),
  ]);

  res.json({ messages, total, newCount, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function getContactMessage(req, res) {
  const message = await ContactMessage.findById(req.params.id).populate("userId", "name email phone");
  if (!message) return res.status(404).json({ message: "Message not found" });

  // Opening a message counts as reading it.
  if (message.status === "NEW") {
    message.status = "READ";
    await message.save();
  }

  res.json({ contactMessage: message });
}

export async function updateContactMessageStatus(req, res) {
  const message = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  ).populate("userId", "name email phone");
  if (!message) return res.status(404).json({ message: "Message not found" });
  res.json({ contactMessage: message });
}

export async function deleteContactMessage(req, res) {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!message) return res.status(404).json({ message: "Message not found" });
  res.json({ message: "Message deleted" });
}
