import { cookies } from "next/headers";
import { jsonError } from "@/app/lib/auth";
import {
  ADMIN_SESSION_COOKIE,
  deleteAdminSession,
} from "@/app/lib/admin-session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  try {
    await deleteAdminSession(token);
    cookieStore.delete(ADMIN_SESSION_COOKIE);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Logout admin gagal:", error);
    return jsonError("Logout gagal. Silakan coba lagi.", 500);
  }
}
