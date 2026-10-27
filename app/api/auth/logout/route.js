import { cookies } from "next/headers";
import { jsonError } from "@/app/lib/auth";
import {
  deleteStudentSession,
  STUDENT_SESSION_COOKIE,
} from "@/app/lib/student-session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_SESSION_COOKIE)?.value;

  try {
    await deleteStudentSession(token);
    cookieStore.delete(STUDENT_SESSION_COOKIE);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Logout pengguna gagal:", error);
    return jsonError("Logout gagal. Silakan coba lagi.", 500);
  }
}
