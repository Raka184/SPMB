"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SchoolMark from "@/app/components/SchoolMark";

export default function PrincipalLoginForm({ role = "principal" }) {
  const isAdmin = role === "admin";
  const roleLabel = isAdmin ? "admin" : "kepala sekolah";
  const roleTitle = isAdmin ? "PORTAL ADMIN" : "PORTAL KEPALA SEKOLAH";
  const portalPath = isAdmin ? "/admin" : "/kepala-sekolah";
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${role}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Login tidak dapat diproses. Silakan coba lagi.");
        setSubmitting(false);
        return;
      }

      router.replace(portalPath);
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <main className={`login-page principal-login-page${isAdmin ? " admin-login-page" : ""}`}>
      <section aria-label={`Portal ${roleLabel} SMK Nan Jaya`} className="welcome-panel">
        <Link aria-label="SMK Nan Jaya" className="school-brand" href="/beranda">
          <SchoolMark />
          <span>SMK NAN JAYA</span>
        </Link>
        <div className="welcome-copy">
          <span className="welcome-kicker">{isAdmin ? "PORTAL ADMINISTRASI SEKOLAH" : "PORTAL MANAJEMEN SEKOLAH"}</span>
          <h1>
            {isAdmin ? <>Mengelola layanan, <span>mendukung masa depan.</span></> : <>Memimpin sekolah, <span>menggerakkan masa depan.</span></>}
          </h1>
          <p>
            Akses portal khusus {roleLabel} untuk mengelola informasi dan layanan
            SMK Nan Jaya.
          </p>
          <div aria-hidden="true" className="growth-bars">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="welcome-caption">
          <span />
          Akses terbatas untuk akun {roleLabel} terdaftar.
        </div>
      </section>

      <section aria-labelledby="principal-login-title" className="form-panel">
        <header className="form-header">
          <Link className="back-link" href="/beranda">
            <svg aria-hidden="true" fill="none" viewBox="0 0 18 18">
              <path
                d="M11.5 4.5 7 9l4.5 4.5M7.5 9h8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.4"
              />
            </svg>
            Kembali ke beranda
          </Link>
        </header>

        <div className="login-content principal-login-content">
          <div className="login-heading">
            <span className="heading-kicker">{roleTitle}</span>
            <h2 id="principal-login-title">Masuk ke portal</h2>
            <p>Gunakan username dan kata sandi akun {roleLabel} Anda.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="principal-username">Username</label>
            <input
              autoComplete="username"
              className="form-input"
              id="principal-username"
              maxLength={50}
              name="username"
              placeholder="Masukkan username"
              required
              type="text"
            />

            <label className="field-label password-label" htmlFor="principal-password">
              Kata sandi
            </label>
            <div className="password-wrap">
              <input
                autoComplete="current-password"
                className="form-input"
                id="principal-password"
                maxLength={128}
                name="password"
                placeholder="Masukkan kata sandi"
                required
                type={passwordVisible ? "text" : "password"}
              />
              <button
                aria-label={passwordVisible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                aria-pressed={passwordVisible}
                className="password-toggle"
                onClick={() => setPasswordVisible((visible) => !visible)}
                type="button"
              >
                {passwordVisible ? "Sembunyi" : "Lihat"}
              </button>
            </div>

            {error && <p className="form-message" role="alert">{error}</p>}

            <button className="submit-button principal-submit" disabled={submitting} type="submit">
              {submitting ? "Memverifikasi..." : `Masuk sebagai ${roleLabel}`}
            </button>
          </form>

          <p className="register-prompt principal-login-prompt">
            {isAdmin
              ? <>Kepala sekolah? <Link href="/kepala-sekolah/login">Masuk ke portal kepala sekolah</Link></>
              : <>Admin sekolah? <Link href="/admin/login">Masuk ke portal admin</Link></>}
          </p>
        </div>

        <footer className="form-footer">
          © 2026 SMK Nan Jaya <span>•</span> Portal {isAdmin ? "Admin" : "Kepala Sekolah"}
        </footer>
      </section>
    </main>
  );
}
