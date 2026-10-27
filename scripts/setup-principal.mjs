import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import mysql from "mysql2/promise";
import nextEnv from "@next/env";
import { hashPassword } from "../app/lib/passwords.mjs";

nextEnv.loadEnvConfig(process.cwd());

function askHidden(prompt) {
  if (!stdin.isTTY) {
    throw new Error("Jalankan perintah setup dari terminal interaktif.");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();

    function finish(error) {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    }

    function onData(chunk) {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish(new Error("Setup dibatalkan."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = [...value].slice(0, -1).join("");
        } else {
          value += character;
        }
      }
    }

    stdin.on("data", onData);
  });
}

const role = process.argv[2] || "principal";
const accountTypes = {
  principal: { label: "kepala sekolah", sessions: "principal_sessions" },
  admin: { label: "admin", sessions: "admin_sessions" },
};

if (!Object.hasOwn(accountTypes, role)) {
  throw new Error("Jenis akun harus principal atau admin.");
}

async function ensureRoleSchema(connection, sessionsTable) {
  const [columns] = await connection.execute(
    "SELECT COLUMN_NAME, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'",
  );
  const columnNames = new Set(columns.map((column) => column.COLUMN_NAME));

  if (!columnNames.has("role")) {
    await connection.query(
      "ALTER TABLE users ADD COLUMN role ENUM('student', 'principal', 'admin') NOT NULL DEFAULT 'student' AFTER password_hash",
    );
  } else {
    await connection.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('student', 'principal', 'admin') NOT NULL DEFAULT 'student'",
    );
  }

  if (!columnNames.has("username")) {
    await connection.query("ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL AFTER full_name");
  }

  const [usernameIndexes] = await connection.execute(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'users_username_unique'",
  );
  if (!usernameIndexes.length) {
    await connection.query("ALTER TABLE users ADD UNIQUE KEY users_username_unique (username)");
  }

  for (const [name, definition] of [
    ["nisn", "CHAR(10) NULL"],
    ["phone", "VARCHAR(20) NULL"],
  ]) {
    const column = columns.find((item) => item.COLUMN_NAME === name);
    if (!column) throw new Error(`Kolom users.${name} tidak ditemukan.`);
    if (column.IS_NULLABLE !== "YES") {
      await connection.query(`ALTER TABLE users MODIFY COLUMN ${name} ${definition}`);
    }
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${sessionsTable} (
      token_hash CHAR(64) NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (token_hash),
      KEY ${sessionsTable}_user_id (user_id),
      KEY ${sessionsTable}_expires_at (expires_at),
      CONSTRAINT ${sessionsTable}_user_fk
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

const prompts = createInterface({ input: stdin, output: stdout });
const ask = (question) => prompts.question(question);
let connection;

try {
  const accountType = accountTypes[role];
  const fullName = (await ask(`Nama ${accountType.label}: `)).trim();
  const username = (await ask("Username: ")).trim().toLowerCase();
  const email = (await ask("Email: ")).trim().toLowerCase();
  prompts.close();

  if (!fullName || fullName.length > 150) {
    throw new Error("Nama wajib diisi dan maksimal 150 karakter.");
  }
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    throw new Error("Username harus terdiri dari 3 hingga 50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.");
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Format email tidak valid.");
  }

  const password = await askHidden("Kata sandi (minimal 8 karakter): ");
  const confirmation = await askHidden("Ulangi kata sandi: ");
  if (password.length < 8 || password.length > 128) {
    throw new Error("Kata sandi harus terdiri dari 8 hingga 128 karakter.");
  }
  if (password !== confirmation) {
    throw new Error("Konfirmasi kata sandi tidak cocok.");
  }

  connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "spmb",
    port: Number(process.env.DB_PORT || 3306),
  });
  await ensureRoleSchema(connection, accountType.sessions);

  const [existingUsers] = await connection.execute(
    "SELECT id, role FROM users WHERE email = ? OR username = ? LIMIT 1",
    [email, username],
  );
  if (existingUsers.length) {
    throw new Error(`Email atau username sudah digunakan oleh akun ${existingUsers[0].role}.`);
  }

  const passwordHash = await hashPassword(password);
  await connection.execute(
    "INSERT INTO users (full_name, username, nisn, email, phone, password_hash, role) VALUES (?, ?, NULL, ?, NULL, ?, ?)",
    [fullName, username, email, passwordHash, role],
  );

  stdout.write(`Akun ${accountType.label} ${username} berhasil dibuat.\n`);
} catch (error) {
  prompts.close();
  console.error(`Setup akun kepala sekolah gagal: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}
