import crypto from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const LENGTH = 10;

export const TRACKING_ID_REGEX = /^[A-Z0-9]{10}$/;

export function generateTrackingId() {
  let id = "";
  for (let i = 0; i < LENGTH; i++) {
    id += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return id;
}
