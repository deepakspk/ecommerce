const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEPAL_PHONE_REGEX = /^(\+977)?9[78]\d{8}$/;

export function isValidEmail(value) {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidPassword(value) {
  return value.length >= 8;
}

export function isValidNepaliPhone(value) {
  return NEPAL_PHONE_REGEX.test(value.trim());
}

export function isValidOtpCode(value) {
  return /^\d{6}$/.test(value.trim());
}
