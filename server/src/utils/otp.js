import crypto from "crypto";

export function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

const NEPAL_PHONE_REGEX = /^(\+977)?9[78]\d{8}$/;

export function isValidNepaliPhone(phone) {
  return NEPAL_PHONE_REGEX.test(phone);
}
