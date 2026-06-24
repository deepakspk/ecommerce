import Address from "../models/Address.js";
import { listBranchesForDistrict } from "../logistics/logisticsManager.js";

export const VALID_PROVINCES = ["koshi", "madhesh", "bagmati", "gandaki", "lumbini", "karnali", "sudurpashchim"];

async function validateBody(body) {
  const { recipientName, phone, province, district, city, branchName } = body;
  const errors = [];
  if (!recipientName?.trim()) errors.push("recipientName is required");
  if (!phone?.trim()) errors.push("phone is required");
  if (!province?.trim()) errors.push("province is required");
  else if (!VALID_PROVINCES.includes(province.toLowerCase().trim())) errors.push("Invalid province");
  if (!district?.trim()) errors.push("district is required");
  if (!city?.trim()) errors.push("city is required");

  // The branch field is only mandatory when our logistics partner actually covers this
  // district — most districts have no coverage at all, so it stays optional for those.
  if (district?.trim() && !branchName?.trim()) {
    const branches = await listBranchesForDistrict(district.trim());
    if (branches.length > 0) errors.push("branchName is required for this district");
  }

  return errors;
}

export async function listAddresses(req, res) {
  const addresses = await Address.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ addresses });
}

export async function createAddress(req, res) {
  const errors = await validateBody(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0] });

  const { label, recipientName, phone, province, district, city, branchName, area, street, landmark, isDefault } = req.body;
  const count = await Address.countDocuments({ userId: req.user._id });
  const makeDefault = isDefault || count === 0;

  if (makeDefault) {
    await Address.updateMany({ userId: req.user._id }, { isDefault: false });
  }

  const address = await Address.create({
    userId: req.user._id,
    label: label?.trim() || "",
    recipientName: recipientName.trim(),
    phone: phone.trim(),
    province: province.trim(),
    district: district.trim(),
    city: city.trim(),
    branchName: branchName?.trim() || "",
    area: area?.trim() || "",
    street: street?.trim() || "",
    landmark: landmark?.trim() || "",
    isDefault: makeDefault,
  });

  res.status(201).json({ address });
}

export async function updateAddress(req, res) {
  const address = await Address.findOne({ _id: req.params.id, userId: req.user._id });
  if (!address) return res.status(404).json({ message: "Address not found" });

  const errors = await validateBody(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0] });

  const { label, recipientName, phone, province, district, city, branchName, area, street, landmark, isDefault } = req.body;

  if (isDefault && !address.isDefault) {
    await Address.updateMany({ userId: req.user._id }, { isDefault: false });
    address.isDefault = true;
  }

  address.label = label?.trim() || "";
  address.recipientName = recipientName.trim();
  address.phone = phone.trim();
  address.province = province.trim();
  address.district = district.trim();
  address.city = city.trim();
  address.branchName = branchName?.trim() || "";
  address.area = area?.trim() || "";
  address.street = street?.trim() || "";
  address.landmark = landmark?.trim() || "";

  await address.save();
  res.json({ address });
}

export async function deleteAddress(req, res) {
  const address = await Address.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!address) return res.status(404).json({ message: "Address not found" });

  if (address.isDefault) {
    const next = await Address.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (next) { next.isDefault = true; await next.save(); }
  }

  res.json({ message: "Address deleted" });
}

export async function setDefault(req, res) {
  const address = await Address.findOne({ _id: req.params.id, userId: req.user._id });
  if (!address) return res.status(404).json({ message: "Address not found" });

  await Address.updateMany({ userId: req.user._id }, { isDefault: false });
  address.isDefault = true;
  await address.save();

  res.json({ address });
}
