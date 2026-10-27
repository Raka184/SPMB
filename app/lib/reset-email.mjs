import nodemailer from "nodemailer";

export function createResetMailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const port = Number(SMTP_PORT || 587);

  if (!SMTP_HOST || !Number.isInteger(port) || port < 1 || port > 65535 || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
    throw new Error("Konfigurasi SMTP belum lengkap. Atur SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, dan SMTP_FROM.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export async function sendPasswordResetCode(mailer, email, fullName, code) {
  const safeName = escapeHtml(fullName);
  await mailer.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Kode Reset Kata Sandi SPMB",
    text: `Halo ${fullName},\n\nKode reset kata sandi Anda adalah ${code}. Kode ini berlaku selama 15 menit. Jika Anda tidak meminta reset kata sandi, abaikan email ini.`,
    html: `<p>Halo ${safeName},</p><p>Kode reset kata sandi Anda:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Kode ini berlaku selama 15 menit. Jika Anda tidak meminta reset kata sandi, abaikan email ini.</p>`,
  });
}
