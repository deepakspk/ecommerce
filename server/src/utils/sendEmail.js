import nodemailer from "nodemailer";
import * as settingsService from "../services/settingsService.js";

function getTransporter() {
  const host = settingsService.get("SMTP_HOST");
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(settingsService.get("SMTP_PORT")) || 587,
    secure: settingsService.get("SMTP_ENCRYPTION") === "SSL",
    auth: { user: settingsService.get("SMTP_USER"), pass: settingsService.get("SMTP_PASS") },
  });
}

export async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[dev email] to=${to} subject="${subject}"\n${html}`);
    return;
  }

  const fromName = settingsService.get("EMAIL_FROM_NAME");
  const fromAddress = settingsService.get("EMAIL_FROM_ADDRESS") || "no-reply@ecommerce-nepal.local";

  await transport.sendMail({
    from: fromName ? `"${fromName}" <${fromAddress}>` : fromAddress,
    to,
    subject,
    html,
  });
}
