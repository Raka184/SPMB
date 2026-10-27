export { hashPassword, verifyPassword } from "./passwords.mjs";

export function validateRegistration(data) {
  const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";
  const nisn = typeof data.nisn === "string" ? data.nisn.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const password = typeof data.newPassword === "string" ? data.newPassword : "";

  if (!fullName || fullName.length > 150) {
    return { error: "Nama lengkap wajib diisi dan maksimal 150 karakter." };
  }
  if (!/^\d{10}$/.test(nisn)) {
    return { error: "NISN harus terdiri dari 10 angka." };
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Format email tidak valid." };
  }
  if (!/^[0-9+()\-\s]{8,20}$/.test(phone)) {
    return { error: "Nomor WhatsApp tidak valid." };
  }
  if (password.length < 8 || password.length > 128) {
    return { error: "Kata sandi harus terdiri dari 8 hingga 128 karakter." };
  }

  return { value: { fullName, nisn, email, phone, password } };
}

export function jsonError(message, status) {
  return Response.json({ success: false, message }, { status });
}
