import { cookies } from "next/headers";
import db from "@/app/lib/db";
import { jsonError, verifyPassword } from "@/app/lib/auth";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSession,
} from "@/app/lib/admin-session";

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

  const username = typeof data.username === "string" ? data.username.trim().toLowerCase() : "";
  const password = typeof data.password === "string" ? data.password : "";
  if (!username || username.length > 254 || !password || password.length > 128) {
    return jsonError("Username dan kata sandi wajib diisi.", 400);
  }

  try {
    const [users] = await db.execute(
      "SELECT id, password_hash FROM users WHERE (username = ? OR email = ?) AND role = 'admin' LIMIT 1",
      [username, username],
    );

    if (!users.length || !(await verifyPassword(password, users[0].password_hash))) {
      return jsonError("Username atau kata sandi tidak sesuai.", 401);
    }

    const token = await createAdminSession(users[0].id);
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      maxAge: ADMIN_SESSION_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Login admin gagal:", error);
    return jsonError("Login gagal karena layanan database bermasalah.", 500);
  }
}
