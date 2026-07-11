import ContactMessage from "../models/ContactMessage.js";
import CompanySettings from "../models/CompanySettings.js";
import * as settingsService from "../services/settingsService.js";
import { sendEmail } from "../utils/sendEmail.js";
import { verifyAccessToken } from "../utils/token.js";

function fireAndForget(promise, label) {
  promise.catch((err) => console.error(`[email] failed to send ${label}:`, err.message));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtSubmittedAt(date) {
  return date.toLocaleString("en-NP", {
    timeZone: "Asia/Kathmandu",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Contact form is public, but if the caller happens to be logged in we link the
// message to their account so admins see who sent it.
function currentUserId(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    return verifyAccessToken(token).sub;
  } catch {
    return null;
  }
}

export async function submitContactMessage(req, res) {
  const { name, email, phone, message } = req.body;

  const contactMessage = await ContactMessage.create({
    name: name?.trim() || "",
    email,
    phone: phone?.trim() || "",
    message,
    userId: currentUserId(req),
  });

  const company = await CompanySettings.findOne().lean();
  const supportInbox = company?.email || settingsService.get("EMAIL_FROM_ADDRESS");
  const submittedAt = fmtSubmittedAt(contactMessage.createdAt);
  const safeMessage = escapeHtml(contactMessage.message).replace(/\n/g, "<br />");

  if (supportInbox) {
    fireAndForget(
      sendEmail({
        to: supportInbox,
        replyTo: contactMessage.email,
        subject: `New customer message${contactMessage.name ? ` from ${contactMessage.name}` : ""}`,
        html: `<p>A customer submitted the contact form:</p>
          <table style="font-size:14px;border-collapse:collapse;">
            ${contactMessage.name ? `<tr><td style="padding:2px 12px 2px 0;color:#64748b;">Name</td><td>${escapeHtml(contactMessage.name)}</td></tr>` : ""}
            <tr><td style="padding:2px 12px 2px 0;color:#64748b;">Email</td><td>${escapeHtml(contactMessage.email)}</td></tr>
            <tr><td style="padding:2px 12px 2px 0;color:#64748b;">Phone</td><td>${escapeHtml(contactMessage.phone) || "—"}</td></tr>
            <tr><td style="padding:2px 12px 2px 0;color:#64748b;">Submitted</td><td>${submittedAt}</td></tr>
          </table>
          <p style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;">${safeMessage}</p>
          <p>Reply to this email to respond directly, or manage it from the admin Messages page.</p>`,
      }),
      `contact-notify:${contactMessage._id}`
    );
  }

  fireAndForget(
    sendEmail({
      to: contactMessage.email,
      subject: "We received your message",
      html: `<p>Hi${contactMessage.name ? ` ${escapeHtml(contactMessage.name)}` : ""},</p>
        <p>Thanks for reaching out! We received your message on ${submittedAt} and our support team will get back to you soon.</p>
        <p style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;">${safeMessage}</p>`,
    }),
    `contact-ack:${contactMessage._id}`
  );

  res.status(201).json({
    message: "Message received. Our team will get back to you soon.",
    contactMessage: { _id: contactMessage._id, createdAt: contactMessage.createdAt },
  });
}
