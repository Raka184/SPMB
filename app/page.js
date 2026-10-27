"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLoadingScreen from "@/app/components/AuthLoadingScreen";
import SchoolMark from "@/app/components/SchoolMark";

function EyeIcon({ visible }) {
  return visible ? (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="m3 3 14 14M8.6 8.6a2 2 0 0 0 2.8 2.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path
        d="M8 4.8A8.6 8.6 0 0 1 10 4.5c4.3 0 7.1 3.8 8 5.2a1 1 0 0 1 0 1 11.3 11.3 0 0 1-2.6 3M5 6.1a11.4 11.4 0 0 0-3 3.6 1 1 0 0 0 0 1c.8 1.4 3.7 5.2 8 5.2.8 0 1.6-.1 2.3-.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  ) : (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M1.9 9.7C2.7 8.3 5.6 4.5 10 4.5s7.2 3.8 8 5.2a1 1 0 0 1 0 1c-.8 1.4-3.7 5.2-8 5.2s-7.2-3.8-8-5.2a1 1 0 0 1-.1-1Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <circle cx="10" cy="10.2" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authResult, setAuthResult] = useState(null);
  const [screen, setScreen] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetMessageType, setResetMessageType] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  async function requestPasswordReset(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("resetEmail") || "").trim().toLowerCase();
    setResetLoading(true);
    setResetMessage("");
    setResetMessageType("");

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setResetMessage(data.message || "Kode reset tidak dapat dikirim. Silakan coba lagi.");
        setResetMessageType("error");
        return;
      }

      setResetEmail(email);
      setResetMessage(data.message);
      setResetMessageType("success");
      setScreen("code");
    } catch {
      setResetMessage("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
      setResetMessageType("error");
    } finally {
      setResetLoading(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setResetLoading(true);
    setResetMessage("");
    setResetMessageType("");

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          code: formData.get("code"),
          newPassword: formData.get("newPassword"),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setResetMessage(data.message || "Kata sandi tidak dapat diubah. Silakan coba lagi.");
        setResetMessageType("error");
        return;
      }

      setScreen("login");
      setResetMessage("Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.");
      setResetMessageType("success");
    } catch {
      setResetMessage("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
      setResetMessageType("error");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setAuthResult(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: formData.get("identity"),
          password: formData.get("password"),
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        router.replace("/siswa");
        return;
      }

      setAuthResult({
        success: false,
        title: "Login gagal",
        message: data.message || "Login tidak dapat diproses. Silakan coba lagi.",
      });
    } catch {
      setAuthResult({
        success: false,
        title: "Login gagal",
        message: "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.",
      });
    }
  }

  function closeAuthResult() {
    setLoading(false);
    setAuthResult(null);
  }

  return (
    <main className="login-page">
      <section aria-label="Informasi SMK Nan Jaya" className="welcome-panel">
        <a aria-label="SMK Nan Jaya" className="school-brand" href="#">
          <SchoolMark />
          <span>SMK NAN JAYA</span>
        </a>

        <div className="welcome-copy">
          <span className="welcome-kicker">MASA DEPANMU DIMULAI DI SINI</span>
          <h1>
            Raih Masa Depan Vokasi Unggulan <span>&amp; Berkarakter</span>
          </h1>
          <p>
            Wujudkan potensimu bersama SMK Nan Jaya. Belajar, bertumbuh, dan
            bersiap menjadi generasi profesional masa depan.
          </p>
          <div aria-hidden="true" className="growth-bars">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="welcome-caption">
          <span />
          Pendidikan berkualitas untuk masa depan yang lebih baik.
        </div>
      </section>

      <section aria-labelledby="login-title" className="form-panel">
        <header className="form-header">
          <a className="small-brand" href="#">
            <SchoolMark />
            <span>SMK NAN JAYA</span>
          </a>
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

        <div className="login-content">
          <div className="login-heading">
            <span className="heading-kicker">PORTAL SPMB ONLINE</span>
            <h2 id="login-title">
              {screen === "login" ? "Masuk ke Akun Anda" : screen === "email" ? "Lupa Kata Sandi?" : "Buat Kata Sandi Baru"}
            </h2>
            <p>
              {screen === "login"
                ? "Silakan masuk untuk melanjutkan ke akun SPMB Anda."
                : screen === "email"
                  ? "Masukkan email akun Anda untuk menerima kode reset kata sandi."
                  : `Masukkan kode yang dikirim ke ${resetEmail}, lalu buat kata sandi baru.`}
            </p>
          </div>

          {resetMessage && screen !== "login" && (
            <p className={`reset-message ${resetMessageType}`} role="status">
              {resetMessage}
            </p>
          )}

          {screen === "email" && (
            <form className="login-form" onSubmit={requestPasswordReset}>
              <label className="field-label" htmlFor="resetEmail">Email</label>
              <input
                autoComplete="email"
                className="form-input"
                id="resetEmail"
                name="resetEmail"
                placeholder="Masukkan email"
                required
                type="email"
              />
              <button className="submit-button" disabled={resetLoading} type="submit">
                {resetLoading ? "Mengirim kode..." : "Kirim Kode Reset"}
              </button>
              <button className="reset-back" onClick={() => { setScreen("login"); setResetMessage(""); }} type="button">
                Kembali ke halaman masuk
              </button>
            </form>
          )}

          {screen === "code" && (
            <form className="login-form" onSubmit={resetPassword}>
              <label className="field-label" htmlFor="resetCode">Kode reset</label>
              <input
                autoComplete="one-time-code"
                className="form-input"
                id="resetCode"
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                name="code"
                pattern="[0-9]{6}"
                placeholder="Masukkan 6 digit kode"
                required
              />
              <label className="field-label password-label" htmlFor="newPassword">Kata sandi baru</label>
              <input
                autoComplete="new-password"
                className="form-input"
                id="newPassword"
                maxLength={128}
                minLength={8}
                name="newPassword"
                placeholder="Minimal 8 karakter"
                required
                type="password"
              />
              <button className="submit-button" disabled={resetLoading} type="submit">
                {resetLoading ? "Menyimpan..." : "Ubah Kata Sandi"}
              </button>
              <button className="reset-back" onClick={() => { setScreen("email"); setResetMessage(""); }} type="button">
                Kembali
              </button>
            </form>
          )}

          {screen === "login" && (
          <>
          {resetMessage && (
            <p className={`reset-message ${resetMessageType}`} role="status">
              {resetMessage}
            </p>
          )}
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="identity">
              Email
            </label>
            <input
              autoComplete="username"
              className="form-input"
              id="identity"
              name="identity"
              placeholder="Masukkan email"
              required
              type="email"
            />

            <label className="field-label password-label" htmlFor="password">
              Kata sandi
            </label>
            <div className="password-wrap">
              <input
                autoComplete="current-password"
                className="form-input"
                id="password"
                minLength={8}
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
                <EyeIcon visible={passwordVisible} />
              </button>
            </div>

            <div className="form-options">
              <label className="remember-option">
                <input name="remember" type="checkbox" />
                <span>Ingat saya</span>
              </label>
              <button className="forgot-link" onClick={() => { setScreen("email"); setResetEmail(""); setResetMessage(""); }} type="button">
                Lupa kata sandi?
              </button>
            </div>

            <button className="submit-button" type="submit">
              Masuk
            </button>
            <Link className="register-button" href="/daftar">
              Daftar Akun Baru
            </Link>
          </form>

          <p className="register-prompt">
            Belum punya akun? <Link href="/daftar">Daftar sekarang</Link>
          </p>
          <p className="principal-login-entry">
            Kepala sekolah? <Link href="/kepala-sekolah/login">Masuk ke portal kepala sekolah</Link>
          </p>
          <p className="principal-login-entry">
            Admin sekolah? <Link href="/admin/login">Masuk ke portal admin</Link>
          </p>
          </>
          )}
        </div>

        <footer className="form-footer">
          © 2026 SMK Nan Jaya <span>•</span> SPMB Online
        </footer>
      </section>
      {loading && (
        <AuthLoadingScreen
          mode="login"
          onClose={closeAuthResult}
          result={authResult}
        />
      )}
    </main>
  );
}
