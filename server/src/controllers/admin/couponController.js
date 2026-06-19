import Coupon from "../../models/Coupon.js";

function toNullableNumber(value) {
  return value === undefined || value === "" || value === null ? null : Number(value);
}

export async function listCoupons(req, res) {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ coupons });
}

export async function getCoupon(req, res) {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  res.json({ coupon });
}

export async function createCoupon(req, res) {
  const { code, type, value, minOrderValue, maxDiscountAmount, usageLimit, perUserLimit, startsAt, expiresAt, isActive } = req.body;

  if (type === "PERCENTAGE" && Number(value) > 100) {
    return res.status(400).json({ message: "Percentage value cannot exceed 100" });
  }

  const normalizedCode = code.trim().toUpperCase();
  const existing = await Coupon.findOne({ code: normalizedCode });
  if (existing) return res.status(409).json({ message: "A coupon with this code already exists" });

  const coupon = await Coupon.create({
    code: normalizedCode,
    type,
    value: Number(value),
    minOrderValue: minOrderValue !== undefined ? Number(minOrderValue) : 0,
    maxDiscountAmount: toNullableNumber(maxDiscountAmount),
    usageLimit: toNullableNumber(usageLimit),
    perUserLimit: toNullableNumber(perUserLimit),
    startsAt: startsAt || null,
    expiresAt: expiresAt || null,
    isActive: isActive === undefined ? true : isActive,
  });
  res.status(201).json({ coupon });
}

export async function updateCoupon(req, res) {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });

  const { code, type, value, minOrderValue, maxDiscountAmount, usageLimit, perUserLimit, startsAt, expiresAt, isActive } = req.body;

  if (code?.trim()) {
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode !== coupon.code) {
      const existing = await Coupon.findOne({ code: normalizedCode, _id: { $ne: coupon._id } });
      if (existing) return res.status(409).json({ message: "A coupon with this code already exists" });
      coupon.code = normalizedCode;
    }
  }

  if (type !== undefined) coupon.type = type;
  if (value !== undefined) coupon.value = Number(value);
  if (coupon.type === "PERCENTAGE" && coupon.value > 100) {
    return res.status(400).json({ message: "Percentage value cannot exceed 100" });
  }

  if (minOrderValue !== undefined) coupon.minOrderValue = Number(minOrderValue);
  if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = toNullableNumber(maxDiscountAmount);
  if (usageLimit !== undefined) coupon.usageLimit = toNullableNumber(usageLimit);
  if (perUserLimit !== undefined) coupon.perUserLimit = toNullableNumber(perUserLimit);
  if (startsAt !== undefined) coupon.startsAt = startsAt || null;
  if (expiresAt !== undefined) coupon.expiresAt = expiresAt || null;
  if (isActive !== undefined) coupon.isActive = isActive;

  await coupon.save();
  res.json({ coupon });
}

export async function deleteCoupon(req, res) {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  res.json({ message: "Coupon deleted" });
}
