import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_BYTES = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, PASSWORD_HASH_BYTES);

  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string") return false;

  const [algorithm, salt, storedKey] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !storedKey) return false;

  const expectedKey = Buffer.from(storedKey, "hex");
  if (expectedKey.length !== PASSWORD_HASH_BYTES) return false;

  const actualKey = await scrypt(password, salt, PASSWORD_HASH_BYTES);
  return timingSafeEqual(expectedKey, actualKey);
}
