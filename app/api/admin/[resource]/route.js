import { cookies } from "next/headers";
import db from "@/app/lib/db";
import { jsonError } from "@/app/lib/auth";
import {
  ADMIN_SESSION_COOKIE,
  findAdminSession,
} from "@/app/lib/admin-session";

const APPLICATION_STATUSES = new Set([
  "pending_verification",
  "verified",
  "passed",
  "not_passed",
]);
const SETTING_KEYS = [
  "academic_year",
  "registration_open_date",
  "registration_close_date",
  "school_contact_email",
  "school_contact_phone",
];

function isValidId(value) {
  return (typeof value === "string" || typeof value === "number")
    && /^\d{1,18}$/.test(String(value))
    && Number(value) > 0;
}

function isValidDate(value) {
  if (value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

async function authenticate(request, requireSameOrigin) {
  const origin = request.headers.get("origin");
  if (requireSameOrigin) {
    let matchesOrigin = false;
    try {
      matchesOrigin = Boolean(origin) && new URL(origin).origin === new URL(request.url).origin;
    } catch {
      return null;
    }
    if (!matchesOrigin) return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return findAdminSession(token);
}

async function updateApplication(id, payload) {
  if (!isValidId(id) || !payload || typeof payload !== "object") {
    return jsonError("Data pendaftar tidak valid.", 400);
  }

  const status = payload.status;
  const majorId = payload.majorId === "" || payload.majorId === null
    ? null
    : payload.majorId;
  if (!APPLICATION_STATUSES.has(status) || (majorId !== null && !isValidId(majorId))) {
    return jsonError("Status atau jurusan yang dipilih tidak valid.", 400);
  }

  const [students] = await db.execute(
    "SELECT id FROM users WHERE id = ? AND role = 'student' LIMIT 1",
    [id],
  );
  if (!students.length) return jsonError("Akun calon siswa tidak ditemukan.", 404);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [applications] = await connection.execute(
      "SELECT major_id FROM spmb_applications WHERE user_id = ? FOR UPDATE",
      [id],
    );
    const currentMajorId = applications[0]?.major_id == null
      ? null
      : String(applications[0].major_id);
    if (majorId !== null && String(majorId) !== currentMajorId) {
      const [majors] = await connection.execute(
        `SELECT capacity
         FROM spmb_majors
         WHERE id = ? AND is_active = TRUE
         FOR UPDATE`,
        [majorId],
      );
      if (!majors.length) {
        await connection.rollback();
        return jsonError("Jurusan tidak aktif atau tidak ditemukan.", 404);
      }
      const [counts] = await connection.execute(
        "SELECT COUNT(*) AS total FROM spmb_applications WHERE major_id = ?",
        [majorId],
      );
      if (Number(counts[0].total) >= Number(majors[0].capacity)) {
        await connection.rollback();
        return jsonError("Daya tampung jurusan sudah penuh.", 409);
      }
    }

    await connection.execute(
      `INSERT INTO spmb_applications (user_id, major_id, status)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE major_id = VALUES(major_id), status = VALUES(status)`,
      [id, majorId, status],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return Response.json({ success: true, message: "Data seleksi berhasil diperbarui." });
}

function validateMajor(payload) {
  if (!payload || typeof payload !== "object") return null;
  const code = typeof payload.code === "string" ? payload.code.trim().toUpperCase() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const capacity = Number(payload.capacity);
  if (
    !/^[A-Z0-9-]{2,20}$/.test(code)
    || !name
    || name.length > 120
    || description.length > 500
    || !Number.isInteger(capacity)
    || capacity < 0
    || capacity > 65535
    || typeof payload.isActive !== "boolean"
  ) return null;
  return { code, name, description: description || null, capacity, isActive: payload.isActive };
}

async function handleMajor(action, id, payload) {
  if (action === "delete") {
    if (!isValidId(id)) return jsonError("Jurusan tidak valid.", 400);
    const [result] = await db.execute("DELETE FROM spmb_majors WHERE id = ?", [id]);
    return result.affectedRows
      ? Response.json({ success: true, message: "Jurusan berhasil dihapus." })
      : jsonError("Jurusan tidak ditemukan.", 404);
  }

  const major = validateMajor(payload);
  if (!major) return jsonError("Periksa kode, nama, kapasitas, dan status jurusan.", 400);

  if (action === "create") {
    await db.execute(
      `INSERT INTO spmb_majors (code, name, description, capacity, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [major.code, major.name, major.description, major.capacity, major.isActive],
    );
    return Response.json({ success: true, message: "Jurusan berhasil ditambahkan." });
  }

  if (action === "update" && isValidId(id)) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [existing] = await connection.execute(
        "SELECT id FROM spmb_majors WHERE id = ? FOR UPDATE",
        [id],
      );
      if (!existing.length) {
        await connection.rollback();
        return jsonError("Jurusan tidak ditemukan.", 404);
      }
      const [counts] = await connection.execute(
        "SELECT COUNT(*) AS total FROM spmb_applications WHERE major_id = ?",
        [id],
      );
      if (major.capacity < Number(counts[0].total)) {
        await connection.rollback();
        return jsonError("Daya tampung tidak boleh lebih kecil dari jumlah pendaftar yang sudah ditempatkan.", 409);
      }
      await connection.execute(
        `UPDATE spmb_majors
         SET code = ?, name = ?, description = ?, capacity = ?, is_active = ?
         WHERE id = ?`,
        [major.code, major.name, major.description, major.capacity, major.isActive, id],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return Response.json({ success: true, message: "Jurusan berhasil diperbarui." });
  }

  return jsonError("Aksi jurusan tidak valid.", 400);
}

function validateAnnouncement(payload) {
  if (!payload || typeof payload !== "object") return null;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (
    !title
    || title.length > 180
    || !body
    || body.length > 10000
    || typeof payload.isPublished !== "boolean"
  ) return null;
  return { title, body, isPublished: payload.isPublished };
}

async function handleAnnouncement(action, id, payload) {
  if (action === "delete") {
    if (!isValidId(id)) return jsonError("Pengumuman tidak valid.", 400);
    const [result] = await db.execute("DELETE FROM spmb_announcements WHERE id = ?", [id]);
    return result.affectedRows
      ? Response.json({ success: true, message: "Pengumuman berhasil dihapus." })
      : jsonError("Pengumuman tidak ditemukan.", 404);
  }

  const announcement = validateAnnouncement(payload);
  if (!announcement) return jsonError("Judul, isi, atau status pengumuman tidak valid.", 400);
  const publishedAt = announcement.isPublished;

  if (action === "create") {
    await db.execute(
      `INSERT INTO spmb_announcements (title, body, is_published, published_at)
       VALUES (?, ?, ?, IF(?, CURRENT_TIMESTAMP, NULL))`,
      [announcement.title, announcement.body, announcement.isPublished, publishedAt],
    );
    return Response.json({ success: true, message: "Pengumuman berhasil dibuat." });
  }

  if (action === "update" && isValidId(id)) {
    const [existing] = await db.execute(
      "SELECT id FROM spmb_announcements WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existing.length) return jsonError("Pengumuman tidak ditemukan.", 404);
    await db.execute(
      `UPDATE spmb_announcements
       SET title = ?, body = ?, is_published = ?,
           published_at = IF(?, COALESCE(published_at, CURRENT_TIMESTAMP), NULL)
       WHERE id = ?`,
      [
        announcement.title,
        announcement.body,
        announcement.isPublished,
        publishedAt,
        id,
      ],
    );
    return Response.json({ success: true, message: "Pengumuman berhasil diperbarui." });
  }

  return jsonError("Aksi pengumuman tidak valid.", 400);
}

const EXAM_OPTIONS = new Set(["A", "B", "C", "D"]);

function validateExamQuestion(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const question = typeof payload.question_text === "string" ? payload.question_text.trim() : "";
  const options = ["a", "b", "c", "d"].map((letter) => (
    typeof payload[`option_${letter}`] === "string" ? payload[`option_${letter}`].trim() : ""
  ));
  const correctOption = typeof payload.correct_option === "string"
    ? payload.correct_option.toUpperCase()
    : "";
  const sortOrder = Number(payload.sort_order);
  if (
    !question
    || question.length > 5000
    || options.some((option) => !option || option.length > 1000)
    || !EXAM_OPTIONS.has(correctOption)
    || !Number.isInteger(sortOrder)
    || sortOrder < 1
    || sortOrder > 65535
  ) return null;
  return { question, options, correctOption, sortOrder };
}

async function handleExamQuestion(action, id, payload) {
  if (!["create", "update", "delete"].includes(action)) {
    return jsonError("Aksi soal ujian tidak valid.", 400);
  }
  if ((action === "update" || action === "delete") && !isValidId(id)) {
    return jsonError("Soal ujian tidak valid.", 400);
  }

  const question = action === "delete" ? null : validateExamQuestion(payload);
  if (action !== "delete" && !question) {
    return jsonError("Lengkapi soal, empat pilihan, kunci jawaban, dan urutan dengan benar.", 400);
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [settings] = await connection.execute(
      "SELECT id FROM spmb_exam_settings WHERE id = 1 FOR UPDATE",
    );
    if (!settings.length) {
      await connection.rollback();
      return jsonError("Pengaturan ujian belum tersedia. Jalankan pembaruan database.", 409);
    }
    const [attempts] = await connection.execute("SELECT COUNT(*) AS total FROM spmb_exam_attempts");
    if (Number(attempts[0].total) > 0) {
      await connection.rollback();
      return jsonError("Soal tidak dapat diubah setelah ada siswa yang memulai ujian.", 409);
    }

    if (action === "delete") {
      const [result] = await connection.execute("DELETE FROM spmb_exam_questions WHERE id = ?", [id]);
      if (!result.affectedRows) {
        await connection.rollback();
        return jsonError("Soal tidak ditemukan.", 404);
      }
    } else {
      const [counts] = await connection.execute("SELECT COUNT(*) AS total FROM spmb_exam_questions");
      if (action === "create" && Number(counts[0].total) >= 500) {
        await connection.rollback();
        return jsonError("Maksimal 500 soal dapat dibuat.", 400);
      }
      const values = [
        question.question,
        ...question.options,
        question.correctOption,
        question.sortOrder,
      ];
      if (action === "create") {
        await connection.execute(
          `INSERT INTO spmb_exam_questions
             (question_text, option_a, option_b, option_c, option_d, correct_option, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          values,
        );
      } else {
        const [result] = await connection.execute(
          `UPDATE spmb_exam_questions
           SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
               correct_option = ?, sort_order = ?
           WHERE id = ?`,
          [...values, id],
        );
        if (!result.affectedRows) {
          await connection.rollback();
          return jsonError("Soal tidak ditemukan.", 404);
        }
      }
    }
    await connection.commit();
    return Response.json({
      success: true,
      message: action === "delete"
        ? "Soal berhasil dihapus."
        : action === "create"
          ? "Soal ujian berhasil ditambahkan."
          : "Soal ujian berhasil diperbarui.",
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateExamSettings(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError("Pengaturan ujian tidak valid.", 400);
  }
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const opensAt = typeof payload.opens_at === "string" ? payload.opens_at.trim() : "";
  const closesAt = typeof payload.closes_at === "string" ? payload.closes_at.trim() : "";
  if (!title || title.length > 180) return jsonError("Judul ujian wajib diisi (maksimal 180 karakter).", 400);
  const isValidDateTime = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
    const date = new Date(value);
    return !Number.isNaN(date.valueOf())
      && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` === value;
  };
  if (!isValidDateTime(opensAt) || !isValidDateTime(closesAt) || closesAt <= opensAt) {
    return jsonError("Isi jadwal buka dan tutup ujian yang valid. Jadwal tutup harus setelah jadwal buka.", 400);
  }
  if (typeof payload.is_open !== "boolean") return jsonError("Status ujian tidak valid.", 400);
  if (payload.is_open) {
    const [questions] = await db.execute("SELECT COUNT(*) AS total FROM spmb_exam_questions");
    if (Number(questions[0].total) === 0) {
      return jsonError("Tambahkan minimal satu soal sebelum membuka ujian.", 409);
    }
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [settings] = await connection.execute(
      "SELECT id FROM spmb_exam_settings WHERE id = 1 FOR UPDATE",
    );
    if (!settings.length) {
      await connection.rollback();
      return jsonError("Pengaturan ujian belum tersedia. Jalankan pembaruan database.", 409);
    }
    await connection.execute(
      `UPDATE spmb_exam_settings
       SET title = ?, opens_at = ?, closes_at = ?, is_open = ?
       WHERE id = 1`,
      [title, opensAt.replace("T", " "), closesAt.replace("T", " "), payload.is_open],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return Response.json({ success: true, message: "Pengaturan ujian berhasil disimpan." });
}

async function updateSettings(payload) {
  if (!payload || typeof payload !== "object") {
    return jsonError("Pengaturan tidak valid.", 400);
  }
  const settings = Object.fromEntries(
    SETTING_KEYS.map((key) => [key, typeof payload[key] === "string" ? payload[key].trim() : ""]),
  );
  const year = settings.academic_year.match(/^(\d{4})\/(\d{4})$/);
  if (!year || Number(year[2]) !== Number(year[1]) + 1) {
    return jsonError("Tahun ajaran harus menggunakan format YYYY/YYYY.", 400);
  }
  if (
    !isValidDate(settings.registration_open_date)
    || !isValidDate(settings.registration_close_date)
  ) return jsonError("Tanggal penerimaan tidak valid.", 400);
  if (
    settings.registration_open_date
    && settings.registration_close_date
    && settings.registration_close_date < settings.registration_open_date
  ) return jsonError("Tanggal penutupan harus sesudah tanggal pembukaan.", 400);
  if (
    settings.school_contact_email
    && (settings.school_contact_email.length > 254
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.school_contact_email))
  ) return jsonError("Email kontak sekolah tidak valid.", 400);
  if (
    settings.school_contact_phone
    && !/^[0-9+()\-\s]{8,20}$/.test(settings.school_contact_phone)
  ) return jsonError("Nomor telepon sekolah tidak valid.", 400);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const key of SETTING_KEYS) {
      await connection.execute(
        `INSERT INTO spmb_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, settings[key]],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return Response.json({ success: true, message: "Pengaturan penerimaan berhasil disimpan." });
}

export async function POST(request, { params }) {
  const admin = await authenticate(request, true);
  if (!admin) return jsonError("Sesi admin tidak valid. Silakan masuk kembali.", 401);

  let data;
  try {
    data = await request.json();
  } catch {
    return jsonError("Data permintaan tidak valid.", 400);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return jsonError("Data permintaan tidak valid.", 400);
  }

  const { resource } = await params;
  const { action, id, payload } = data;

  try {
    if (resource === "applications" && action === "update") {
      return await updateApplication(id, payload);
    }
    if (resource === "majors") return await handleMajor(action, id, payload);
    if (resource === "announcements") return await handleAnnouncement(action, id, payload);
    if (resource === "exam" && action === "configure") return await updateExamSettings(payload);
    if (resource === "exam") return await handleExamQuestion(action, id, payload);
    if (resource === "settings" && action === "update") return await updateSettings(payload);
    return jsonError("Aksi admin tidak dikenal.", 400);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return jsonError("Kode jurusan tersebut sudah digunakan.", 409);
    }
    console.error(`Aksi admin ${resource} gagal:`, error);
    return jsonError("Perubahan gagal karena layanan database bermasalah.", 500);
  }
}

function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request, { params }) {
  const admin = await authenticate(request, false);
  if (!admin) return jsonError("Sesi admin tidak valid. Silakan masuk kembali.", 401);

  const { resource } = await params;
  if (resource !== "reports") return jsonError("Laporan tidak ditemukan.", 404);

  try {
    const [students] = await db.execute(
      `SELECT users.full_name, users.nisn, users.email, users.phone,
              users.created_at, spmb_majors.code AS major_code,
              spmb_applications.status
       FROM users
       LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
       LEFT JOIN spmb_majors ON spmb_majors.id = spmb_applications.major_id
       WHERE users.role = 'student'
       ORDER BY users.created_at DESC`,
    );
    const headers = [
      "Nama",
      "NISN",
      "Email",
      "Nomor telepon",
      "Jurusan",
      "Status seleksi",
      "Tanggal daftar akun",
    ];
    const statusLabels = {
      pending_verification: "Menunggu verifikasi",
      verified: "Terverifikasi",
      passed: "Lolos seleksi",
      not_passed: "Tidak lolos",
    };
    const rows = students.map((student) => [
      student.full_name,
      student.nisn,
      student.email,
      student.phone,
      student.major_code,
      statusLabels[student.status] || statusLabels.pending_verification,
      student.created_at?.toISOString?.() || student.created_at,
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;

    return new Response(csv, {
      headers: {
        "Content-Disposition": 'attachment; filename="laporan-pendaftar-spmb.csv"',
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Ekspor laporan admin gagal:", error);
    return jsonError("Laporan gagal dibuat karena layanan database bermasalah.", 500);
  }
}
