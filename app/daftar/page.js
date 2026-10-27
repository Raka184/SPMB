"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLoadingScreen from "@/app/components/AuthLoadingScreen";
import SchoolMark from "@/app/components/SchoolMark";

function EyeIcon({ visible }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      {visible ? (
        <>
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
        </>
      ) : (
        <>
          <path
            d="M1.9 9.7C2.7 8.3 5.6 4.5 10 4.5s7.2 3.8 8 5.2a1 1 0 0 1 0 1c-.8 1.4-3.7 5.2-8 5.2s-7.2-3.8-8-5.2a1 1 0 0 1-.1-1Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
          <circle
            cx="10"
            cy="10.2"
            r="2.5"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </>
      )}
    </svg>
  );
}

function FormField({ id, label, placeholder, type = "text", autoComplete }) {
  return (
    <div className="register-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className="form-input"
        id={id}
        name={id}
        placeholder={placeholder}
        required
        type={type}
      />
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [majors, setMajors] = useState([]);
  const [majorLoadError, setMajorLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [registerResult, setRegisterResult] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadMajors() {
      try {
        const response = await fetch("/api/majors");
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Daftar jurusan tidak dapat dimuat.");
        }
        if (active) setMajors(result.majors);
      } catch (error) {
        if (active) setMajorLoadError(error.message || "Daftar jurusan tidak dapat dimuat.");
      }
    }

    loadMajors();
    return () => { active = false; };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    if (formData.get("newPassword") !== formData.get("confirmPassword")) {
      setMessage("Konfirmasi kata sandi belum sesuai.");
      return;
    }

    setMessage("");
    setRegisterResult(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          nisn: formData.get("nisn"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          majorId: formData.get("majorId"),
          newPassword: formData.get("newPassword"),
        }),
      });
      const data = await response.json();
      const success = response.ok && data.success;

      setRegisterResult({
        success,
        title: success ? "Akun berhasil dibuat" : "Pendaftaran gagal",
        message: data.message || "Pendaftaran tidak dapat diproses. Silakan coba lagi.",
      });
    } catch {
      setRegisterResult({
        success: false,
        title: "Pendaftaran gagal",
        message: "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.",
      });
    }
  }

  function closeRegisterResult() {
    if (registerResult?.success) {
      router.push("/");
      return;
    }

    setLoading(false);
    setRegisterResult(null);
  }

  return (
    <main className="login-page">
      <section aria-label="Informasi SMK Nan Jaya" className="welcome-panel">
        <Link aria-label="SMK Nan Jaya" className="school-brand" href="/">
          <SchoolMark />
          <span>SMK NAN JAYA</span>
        </Link>

        <div className="welcome-copy">
          <span className="welcome-kicker">PENERIMAAN MURID BARU 2026/2027</span>
          <h1>
            Mulai Langkah Awal Menjadi{" "}
            <span>Generasi Vokasi Profesional</span>
          </h1>
          <p>
            Bergabunglah bersama SMK Nan Jaya dan siapkan dirimu untuk masa
            depan yang penuh peluang.
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

      <section aria-labelledby="register-title" className="form-panel">
        <header className="form-header">
          <Link className="small-brand" href="/">
            <SchoolMark />
            <span>SMK NAN JAYA</span>
          </Link>
          <Link className="back-link" href="/">
            <svg aria-hidden="true" fill="none" viewBox="0 0 18 18">
              <path
                d="M11.5 4.5 7 9l4.5 4.5M7.5 9h8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.4"
              />
            </svg>
            Kembali ke masuk
          </Link>
        </header>

        <div className="login-content register-content">
          <div className="login-heading">
            <span className="heading-kicker">PORTAL SPMB ONLINE</span>
            <h2 id="register-title">Daftar Akun Baru</h2>
            <p>Lengkapi data berikut untuk membuat akun calon murid.</p>
          </div>

          <form className="login-form register-form" onSubmit={handleSubmit}>
            <FormField
              autoComplete="name"
              id="fullName"
              label="Nama lengkap"
              placeholder="Masukkan nama lengkap"
            />
            <FormField
              autoComplete="username"
              id="nisn"
              label="NISN"
              placeholder="Masukkan NISN"
            />
            <FormField
              autoComplete="email"
              id="email"
              label="Email"
              placeholder="contoh@email.com"
              type="email"
            />
            <FormField
              autoComplete="tel"
              id="phone"
              label="Nomor WhatsApp"
              placeholder="08xxxxxxxxxx"
              type="tel"
            />

            <div className="register-field">
              <label className="field-label" htmlFor="majorId">
                Jurusan pilihan <span aria-hidden="true">*</span>
              </label>
              <select
                className="form-input"
                defaultValue=""
                id="majorId"
                name="majorId"
                required
              >
                <option disabled value="">Pilih jurusan</option>
                {majors.map((major) => (
                  <option key={major.id} value={major.id}>
                    {major.name} · {Number(major.capacity).toLocaleString("id-ID")} kursi
                  </option>
                ))}
              </select>
              {majorLoadError && <small className="form-message" role="alert">{majorLoadError}</small>}
              {!majorLoadError && !majors.length && (
                <small className="register-helper">Jurusan belum tersedia; pilihan dapat ditambahkan administrator.</small>
              )}
            </div>

            <div className="register-field">
              <label className="field-label" htmlFor="newPassword">
                Kata sandi
              </label>
              <div className="password-wrap">
                <input
                  autoComplete="new-password"
                  className="form-input"
                  id="newPassword"
                  minLength={8}
                  name="newPassword"
                  placeholder="Minimal 8 karakter"
                  required
                  type={passwordVisible ? "text" : "password"}
                />
                <button
                  aria-label={
                    passwordVisible
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  aria-pressed={passwordVisible}
                  className="password-toggle"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  <EyeIcon visible={passwordVisible} />
                </button>
              </div>
            </div>

            <FormField
              autoComplete="new-password"
              id="confirmPassword"
              label="Konfirmasi kata sandi"
              placeholder="Ulangi kata sandi"
              type="password"
            />

            <button className="submit-button register-submit" type="submit">
              Daftar Sekarang
            </button>
            {message && (
              <p className="form-message" role="status">
                {message}
              </p>
            )}
          </form>

          <p className="register-prompt">
            Sudah punya akun? <Link href="/">Masuk</Link>
          </p>
        </div>

        <footer className="form-footer">
          © 2026 SMK Nan Jaya <span>•</span> SPMB Online
        </footer>
      </section>
      {loading && (
        <AuthLoadingScreen
          mode="register"
          onClose={closeRegisterResult}
          result={registerResult}
        />
      )}
    </main>
  );
}
