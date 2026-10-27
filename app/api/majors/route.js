import db from "@/app/lib/db";
import { jsonError } from "@/app/lib/auth";

export async function GET() {
  try {
    const [majors] = await db.execute(
      `SELECT id, code, name, capacity, description
       FROM spmb_majors
       WHERE is_active = TRUE
       ORDER BY name`,
    );
    return Response.json({ success: true, majors });
  } catch (error) {
    console.error("Daftar jurusan gagal dimuat:", error);
    return jsonError("Daftar jurusan belum dapat dimuat.", 500);
  }
}
