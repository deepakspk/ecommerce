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

// Text-based logo header so branding renders in every email client without
// depending on externally hosted images.
function brandedTemplate(html) {
  return `<div style="background:#f1f5f9;padding:24px 12px;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#1e293b;padding:18px 24px;">
        <span style="font-size:22px;font-weight:700;color:#ffffff;">Gyan<span style="color:#93c5fd;">Kosh</span></span>
        <span style="display:block;margin-top:2px;font-size:10px;letter-spacing:3px;color:#94a3b8;">ONLINE BOOKSTORE</span>
      </div>
      <div style="padding:24px;color:#334155;font-size:14px;line-height:1.6;">${html}</div>
      <div style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">
        © ${new Date().getFullYear()} GyanKosh · Happy reading!
      </div>
    </div>
  </div>`;
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
    html: brandedTemplate(html),
  });
}
