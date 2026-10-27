import { createHash, randomBytes } from "node:crypto";
import db from "@/app/lib/db";

export const STUDENT_SESSION_COOKIE = "spmb_student_session";
export const STUDENT_SESSION_MAX_AGE = 8 * 60 * 60;

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createStudentSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + STUDENT_SESSION_MAX_AGE * 1000);

  await db.execute(
    "INSERT INTO student_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    [hashSessionToken(token), userId, expiresAt],
  );

  return token;
}

export async function findStudentSession(token) {
  if (typeof token !== "string" || token.length > 128) return null;

  const [sessions] = await db.execute(
    `SELECT users.id, users.full_name, users.email, users.nisn, users.phone
     FROM student_sessions
     INNER JOIN users ON users.id = student_sessions.user_id
     WHERE student_sessions.token_hash = ?
       AND student_sessions.expires_at > CURRENT_TIMESTAMP
       AND users.role = 'student'
     LIMIT 1`,
    [hashSessionToken(token)],
  );

  return sessions[0] || null;
}

export async function deleteStudentSession(token) {
  if (typeof token !== "string" || token.length > 128) return;

  await db.execute(
    "DELETE FROM student_sessions WHERE token_hash = ?",
    [hashSessionToken(token)],
  );
}
