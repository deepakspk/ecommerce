import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();

  if (!transport) {
    console.log(`[dev email] to=${to} subject="${subject}"\n${html}`);
    return;
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || "no-reply@ecommerce-nepal.local",
    to,
    subject,
    html,
  });
}
