import { createHash, randomBytes } from "node:crypto";
import db from "@/app/lib/db";

export const PRINCIPAL_SESSION_COOKIE = "spmb_principal_session";
export const PRINCIPAL_SESSION_MAX_AGE = 8 * 60 * 60;

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPrincipalSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + PRINCIPAL_SESSION_MAX_AGE * 1000);

  await db.execute(
    "INSERT INTO principal_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    [hashSessionToken(token), userId, expiresAt],
  );

  return token;
}

export async function findPrincipalSession(token) {
  if (typeof token !== "string" || token.length > 128) return null;

  const [sessions] = await db.execute(
    `SELECT users.id, users.full_name, users.email
     FROM principal_sessions
     INNER JOIN users ON users.id = principal_sessions.user_id
     WHERE principal_sessions.token_hash = ?
       AND principal_sessions.expires_at > CURRENT_TIMESTAMP
       AND users.role = 'principal'
     LIMIT 1`,
    [hashSessionToken(token)],
  );

  return sessions[0] || null;
}

export async function deletePrincipalSession(token) {
  if (typeof token !== "string" || token.length > 128) return;

  await db.execute(
    "DELETE FROM principal_sessions WHERE token_hash = ?",
    [hashSessionToken(token)],
  );
}
