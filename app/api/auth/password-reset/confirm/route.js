import db from "@/app/lib/db";
import { hashPassword, jsonError, verifyPassword } from "@/app/lib/auth";

export async function POST(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return jsonError("Data reset kata sandi tidak valid.", 400);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return jsonError("Data reset kata sandi tidak valid.", 400);
  }

  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const code = typeof data.code === "string" ? data.code : "";
  const newPassword = typeof data.newPassword === "string" ? data.newPassword : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
    return jsonError("Email atau kode reset tidak valid.", 400);
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return jsonError("Kata sandi baru harus terdiri dari 8 hingga 128 karakter.", 400);
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [users] = await connection.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [email],
    );
    if (!users.length) {
      await connection.rollback();
      return jsonError("Kode reset tidak valid atau sudah kedaluwarsa.", 400);
    }

    const userId = users[0].id;
    const [resetCodes] = await connection.execute(
      "SELECT code_hash, expires_at, attempts, expires_at <= UTC_TIMESTAMP() AS is_expired FROM password_reset_codes WHERE user_id = ? FOR UPDATE",
      [userId],
    );
    if (!resetCodes.length || resetCodes[0].is_expired || resetCodes[0].attempts >= 5) {
      await connection.execute("DELETE FROM password_reset_codes WHERE user_id = ?", [userId]);
      await connection.commit();
      return jsonError("Kode reset tidak valid atau sudah kedaluwarsa.", 400);
    }

    if (!(await verifyPassword(code, resetCodes[0].code_hash))) {
      await connection.execute(
        "UPDATE password_reset_codes SET attempts = attempts + 1 WHERE user_id = ?",
        [userId],
      );
      await connection.commit();
      return jsonError("Kode reset tidak valid atau sudah kedaluwarsa.", 400);
    }

    const passwordHash = await hashPassword(newPassword);
    await connection.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
    await connection.execute("DELETE FROM password_reset_codes WHERE user_id = ?", [userId]);
    await connection.execute("DELETE FROM student_sessions WHERE user_id = ?", [userId]);
    await connection.execute("DELETE FROM principal_sessions WHERE user_id = ?", [userId]);
    await connection.execute("DELETE FROM admin_sessions WHERE user_id = ?", [userId]);
    await connection.commit();

    return Response.json({ success: true, message: "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Reset kata sandi gagal:", error);
    return jsonError("Kata sandi tidak dapat diubah karena layanan bermasalah.", 500);
  } finally {
    connection?.release();
  }
}
