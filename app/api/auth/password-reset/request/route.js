import { randomInt } from "node:crypto";
import db from "@/app/lib/db";
import { hashPassword, jsonError } from "@/app/lib/auth";
import { createResetMailer, sendPasswordResetCode } from "@/app/lib/reset-email.mjs";

const GENERIC_MESSAGE = "Jika email terdaftar, kode reset akan dikirim. Periksa kotak masuk dan folder spam.";

export async function POST(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return jsonError("Data email tidak valid.", 400);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return jsonError("Data email tidak valid.", 400);
  }

  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Masukkan alamat email yang valid.", 400);
  }

  let mailer;
  try {
    mailer = createResetMailer();
  } catch (error) {
    console.error("Konfigurasi email reset kata sandi tidak valid:", error);
    return jsonError("Pengiriman email belum dikonfigurasi. Hubungi administrator.", 503);
  }

  try {
    const [users] = await db.execute(
      "SELECT id, full_name, email FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    if (!users.length) return Response.json({ success: true, message: GENERIC_MESSAGE });

    const user = users[0];
    const [recentCodes] = await db.execute(
      "SELECT created_at > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 MINUTE) AS is_recent FROM password_reset_codes WHERE user_id = ?",
      [user.id],
    );
    if (recentCodes.length && recentCodes[0].is_recent) {
      return Response.json({ success: true, message: GENERIC_MESSAGE });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = await hashPassword(code);
    await db.execute(
      `INSERT INTO password_reset_codes (user_id, code_hash, expires_at, attempts)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE), 0)
       ON DUPLICATE KEY UPDATE code_hash = VALUES(code_hash), expires_at = VALUES(expires_at), attempts = 0, created_at = CURRENT_TIMESTAMP`,
      [user.id, codeHash],
    );

    try {
      await sendPasswordResetCode(mailer, user.email, user.full_name, code);
    } catch (error) {
      await db.execute(
        "DELETE FROM password_reset_codes WHERE user_id = ? AND code_hash = ?",
        [user.id, codeHash],
      );
      throw error;
    }

    return Response.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Pengiriman kode reset kata sandi gagal:", error);
    return jsonError("Kode reset tidak dapat dikirim. Silakan coba lagi nanti.", 500);
  }
}
