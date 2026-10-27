import { cookies } from "next/headers";
import db from "@/app/lib/db";
import { jsonError, verifyPassword } from "@/app/lib/auth";
import {
  createStudentSession,
  STUDENT_SESSION_COOKIE,
  STUDENT_SESSION_MAX_AGE,
} from "@/app/lib/student-session";

export async function POST(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return jsonError("Data login tidak valid.", 400);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return jsonError("Data login tidak valid.", 400);
  }

  const email = typeof data.identity === "string" ? data.identity.trim().toLowerCase() : "";
  const password = typeof data.password === "string" ? data.password : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 128) {
    return jsonError("Email yang valid dan kata sandi wajib diisi.", 400);
  }

  try {
    const [users] = await db.execute(
      "SELECT id, full_name, password_hash FROM users WHERE role = 'student' AND email = ? LIMIT 1",
      [email],
    );

    if (!users.length || !(await verifyPassword(password, users[0].password_hash))) {
      return jsonError("Email atau kata sandi tidak sesuai.", 401);
    }

    const token = await createStudentSession(users[0].id);
    const cookieStore = await cookies();
    cookieStore.set(STUDENT_SESSION_COOKIE, token, {
      httpOnly: true,
      maxAge: STUDENT_SESSION_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return Response.json({
      success: true,
      message: "Login berhasil diverifikasi. Selamat datang, " + users[0].full_name + ".",
    });
  } catch (error) {
    console.error("Login akun gagal:", error);
    return jsonError("Login gagal karena layanan database bermasalah.", 500);
  }
}
