import { cookies } from "next/headers";
import { jsonError } from "@/app/lib/auth";
import {
  deletePrincipalSession,
  PRINCIPAL_SESSION_COOKIE,
} from "@/app/lib/principal-session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PRINCIPAL_SESSION_COOKIE)?.value;

  try {
    await deletePrincipalSession(token);
    cookieStore.delete(PRINCIPAL_SESSION_COOKIE);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Logout kepala sekolah gagal:", error);
    return jsonError("Logout gagal. Silakan coba lagi.", 500);
  }
}
