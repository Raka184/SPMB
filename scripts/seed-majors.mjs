import mysql from "mysql2/promise";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const majors = [
  {
    code: "DKV",
    name: "Desain Komunikasi Visual",
    description: "Mempelajari desain grafis, ilustrasi, fotografi, dan komunikasi visual.",
  },
  {
    code: "PH",
    name: "Perhotelan",
    description: "Mempelajari layanan perhotelan, tata boga, dan pengelolaan akomodasi.",
  },
  {
    code: "PM",
    name: "Pemasaran",
    description: "Mempelajari pemasaran digital, penjualan, dan pengelolaan bisnis ritel.",
  },
  {
    code: "MPLB",
    name: "Manajemen Perkantoran dan Layanan Bisnis",
    description: "Mempelajari administrasi perkantoran, layanan bisnis, dan komunikasi profesional.",
  },
  {
    code: "TKJ",
    name: "Teknik Komputer dan Jaringan",
    description: "Mempelajari perakitan komputer, jaringan, dan administrasi sistem.",
  },
  {
    code: "RPL",
    name: "Rekayasa Perangkat Lunak",
    description: "Mempelajari pemrograman, basis data, dan pengembangan aplikasi.",
  },
  {
    code: "TM",
    name: "Teknik Mesin",
    description: "Mempelajari proses manufaktur, teknik pemesinan, dan perawatan mesin.",
  },
].map((major) => ({ ...major, capacity: 36 }));

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "spmb",
  port: Number(process.env.DB_PORT || 3306),
});

try {
  await db.beginTransaction();
  for (const major of majors) {
    await db.execute(
      `INSERT IGNORE INTO spmb_majors (code, name, description, capacity, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [major.code, major.name, major.description, major.capacity],
    );
  }
  await db.commit();

  const [rows] = await db.execute(
    `SELECT code, name, capacity, is_active
     FROM spmb_majors
     WHERE code IN (?, ?, ?, ?, ?, ?, ?)
     ORDER BY FIELD(code, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ...majors.map(({ code }) => code),
      ...majors.map(({ code }) => code),
    ],
  );
  console.log(`Jurusan tersedia: ${rows.length} (${rows.map(({ code }) => code).join(", ")}).`);
} catch (error) {
  await db.rollback();
  console.error("Gagal menambahkan data jurusan:", error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
