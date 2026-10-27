import db from "@/app/lib/db";
import { hashPassword, jsonError, validateRegistration } from "@/app/lib/auth";

export async function POST(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return jsonError("Data pendaftaran tidak valid.", 400);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return jsonError("Data pendaftaran tidak valid.", 400);
  }

  const validation = validateRegistration(data);
  if (validation.error) return jsonError(validation.error, 400);

  const { fullName, nisn, email, phone, password } = validation.value;
  const majorId = data.majorId;
  if (
    (typeof majorId !== "string" && typeof majorId !== "number")
    || !/^[1-9]\d{0,17}$/.test(String(majorId))
  ) {
    return jsonError("Pilih jurusan sebelum membuat akun.", 400);
  }
  let connection;

  try {
    const [settings] = await db.execute(
      `SELECT setting_key, setting_value,
              DATE_FORMAT(CURRENT_DATE, '%Y-%m-%d') AS today
       FROM spmb_settings
       WHERE setting_key IN ('registration_open_date', 'registration_close_date')`,
    );
    const dates = Object.fromEntries(settings.map(({ setting_key, setting_value }) => [setting_key, setting_value]));
    const today = settings[0]?.today;
    if (
      (dates.registration_open_date && today && today < dates.registration_open_date)
      || (dates.registration_close_date && today && today > dates.registration_close_date)
    ) {
      return jsonError("Pendaftaran sedang tidak dibuka. Periksa jadwal penerimaan di portal SPMB.", 403);
    }

    const [availableMajors] = await db.execute(
      "SELECT id FROM spmb_majors WHERE id = ? AND is_active = TRUE LIMIT 1",
      [majorId],
    );
    if (!availableMajors.length) {
      return jsonError("Jurusan tidak tersedia untuk pendaftaran.", 400);
    }

    const passwordHash = await hashPassword(password);
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [majors] = await connection.execute(
      `SELECT capacity
       FROM spmb_majors
       WHERE id = ? AND is_active = TRUE
       FOR UPDATE`,
      [majorId],
    );
    if (!majors.length) {
      await connection.rollback();
      return jsonError("Jurusan tidak tersedia untuk pendaftaran.", 400);
    }
    const [counts] = await connection.execute(
      "SELECT COUNT(*) AS total FROM spmb_applications WHERE major_id = ?",
      [majorId],
    );
    if (Number(counts[0].total) >= Number(majors[0].capacity)) {
      await connection.rollback();
      return jsonError("Daya tampung jurusan sudah penuh.", 409);
    }
    await connection.execute(
      `INSERT INTO users (full_name, nisn, email, phone, password_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [fullName, nisn, email, phone, passwordHash],
    );
    await connection.execute(
      `INSERT INTO spmb_applications (user_id, major_id)
       SELECT id, ? FROM users WHERE email = ?`,
      [majorId, email],
    );
    await connection.commit();

    return Response.json(
      { success: true, message: "Akun berhasil dibuat. Silakan masuk menggunakan email Anda." },
      { status: 201 },
    );
  } catch (error) {
    if (connection) await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return jsonError("NISN atau email tersebut sudah terdaftar.", 409);
    }

    console.error("Pendaftaran akun gagal:", error);
    return jsonError("Pendaftaran gagal karena layanan database bermasalah.", 500);
  } finally {
    connection?.release();
  }
}
