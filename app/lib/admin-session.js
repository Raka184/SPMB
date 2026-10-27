import { createHash, randomBytes } from "node:crypto";
import db from "@/app/lib/db";

export const ADMIN_SESSION_COOKIE = "spmb_admin_session";
export const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60;

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE * 1000);

  await db.execute(
    "INSERT INTO admin_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    [hashSessionToken(token), userId, expiresAt],
  );

  return token;
}

export async function findAdminSession(token) {
  if (typeof token !== "string" || token.length > 128) return null;

  const [sessions] = await db.execute(
    `SELECT users.id, users.full_name, users.email
     FROM admin_sessions
     INNER JOIN users ON users.id = admin_sessions.user_id
     WHERE admin_sessions.token_hash = ?
       AND admin_sessions.expires_at > CURRENT_TIMESTAMP
       AND users.role = 'admin'
     LIMIT 1`,
    [hashSessionToken(token)],
  );

  return sessions[0] || null;
}

export async function deleteAdminSession(token) {
  if (typeof token !== "string" || token.length > 128) return;

  await db.execute(
    "DELETE FROM admin_sessions WHERE token_hash = ?",
    [hashSessionToken(token)],
  );
}
