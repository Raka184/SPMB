import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AdminLogoutButton from "@/app/admin/LogoutButton";
import AdminSidebar from "@/app/admin/AdminSidebar";
import PrintRegistrationButton from "@/app/admin/pendaftar/[id]/PrintRegistrationButton";
import SchoolMark from "@/app/components/SchoolMark";
import db from "@/app/lib/db";
import {
  ADMIN_SESSION_COOKIE,
  findAdminSession,
} from "@/app/lib/admin-session";

const statusLabels = {
  pending_verification: "Menunggu verifikasi",
  verified: "Terverifikasi",
  passed: "Lolos seleksi",
  not_passed: "Tidak lolos",
};

function formatDate(value) {
  if (!value) return "Belum tersedia";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export async function generateMetadata() {
  return {
    title: "Detail Pendaftar | Admin SMK Nan Jaya",
    description: "Informasi pendaftaran dan status seleksi calon siswa.",
  };
}

export default async function AdminApplicantDetailPage({ params }) {
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id) || Number(id) < 1) notFound();

  const cookieStore = await cookies();
  const admin = await findAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!admin) redirect("/admin/login");

  const [rows] = await db.execute(
    `SELECT users.id, users.full_name, users.nisn, users.email, users.phone,
            users.created_at AS registered_at,
            spmb_applications.status, spmb_applications.created_at AS application_created_at,
            spmb_applications.updated_at AS application_updated_at,
            spmb_majors.code AS major_code, spmb_majors.name AS major_name
     FROM users
     LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
     LEFT JOIN spmb_majors ON spmb_majors.id = spmb_applications.major_id
     WHERE users.id = ? AND users.role = 'student'
     LIMIT 1`,
    [id],
  );
  const applicant = rows[0];
  if (!applicant) notFound();

  const status = applicant.status || "pending_verification";
  const statusLabel = statusLabels[status] || statusLabels.pending_verification;
  const registrationDate = applicant.application_created_at || applicant.registered_at;
  const lastUpdated = applicant.application_updated_at || registrationDate;

  return (
    <main className="admin-dashboard">
      <header className="admin-topbar">
        <Link aria-label="Dashboard admin SMK Nan Jaya" className="admin-brand" href="/admin">
          <SchoolMark />
          <span>SPMB ADMIN<small>SMK NAN JAYA</small></span>
        </Link>
        <form action="/admin/pendaftar" className="admin-search" role="search">
          <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
            <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.6" />
            <path d="m13.2 13.2 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
          </svg>
          <input aria-label="Cari pendaftar" maxLength={100} name="q" placeholder="Cari nama, email, atau NISN..." type="search" />
          <button type="submit">Cari</button>
        </form>
        <div className="admin-topbar-user">
          <span aria-hidden="true" className="admin-topbar-avatar">{admin.full_name.trim().charAt(0).toUpperCase()}</span>
          <span className="admin-topbar-name">{admin.full_name}<small>Administrator</small></span>
          <AdminLogoutButton />
        </div>
      </header>

      <div className="admin-dashboard-layout">
        <AdminSidebar admin={admin} currentSection="pendaftar" />
        <section aria-labelledby="admin-applicant-title" className="admin-dashboard-content admin-workspace-content admin-applicant-detail">
          <div className="admin-detail-toolbar">
            <Link className="admin-detail-back" href="/admin/pendaftar">
              <span aria-hidden="true">←</span> Kembali ke Semua Pendaftar
            </Link>
            <span className="admin-detail-breadcrumb">Pendaftar / Detail Pendaftar</span>
          </div>

          <div className="admin-dashboard-heading admin-applicant-heading">
            <div>
              <h1 id="admin-applicant-title">Detail Pendaftar</h1>
              <p>Informasi pendaftaran, data akun, dan status verifikasi.</p>
            </div>
            <PrintRegistrationButton />
          </div>

          <article className="admin-panel admin-applicant-summary">
            <span aria-hidden="true" className="admin-applicant-avatar">
              {applicant.full_name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="admin-applicant-summary-copy">
              <h2>{applicant.full_name}</h2>
              <p>NISN {applicant.nisn || "Belum tersedia"} <span aria-hidden="true">•</span> {applicant.email}</p>
              <small>Terdaftar {formatDate(registrationDate)}</small>
            </div>
            <div className="admin-applicant-summary-status">
              <span className={`admin-account-status status-${status}`}>{statusLabel}</span>
              <small>Status diperbarui {formatDate(lastUpdated)}</small>
            </div>
          </article>

          <div className="admin-applicant-detail-grid">
            <div className="admin-applicant-detail-main">
              <section className="admin-panel admin-applicant-panel">
                <header className="admin-panel-heading">
                  <div><h2>Biodata Pendaftar</h2><p>Informasi akun calon siswa yang tersimpan.</p></div>
                </header>
                <dl className="admin-applicant-fields">
                  <div><dt>Nama lengkap</dt><dd>{applicant.full_name}</dd></div>
                  <div><dt>NISN</dt><dd>{applicant.nisn || "Belum tersedia"}</dd></div>
                  <div><dt>Email</dt><dd>{applicant.email}</dd></div>
                  <div><dt>Nomor telepon</dt><dd>{applicant.phone || "Belum tersedia"}</dd></div>
                  <div><dt>Tanggal pendaftaran</dt><dd>{formatDate(registrationDate)}</dd></div>
                </dl>
                <p className="admin-detail-data-note">
                  Data tempat dan tanggal lahir, jenis kelamin, agama, alamat, serta nama orang tua belum tersedia pada formulir pendaftaran.
                </p>
              </section>

              <section className="admin-panel admin-applicant-panel">
                <header className="admin-panel-heading">
                  <div><h2>Asal Sekolah</h2><p>Informasi sekolah sebelumnya.</p></div>
                </header>
                <div className="admin-unavailable-data">
                  <span aria-hidden="true">i</span>
                  <p>Data asal sekolah dan informasi kelulusan belum tercatat pada sistem.</p>
                </div>
              </section>

              <section className="admin-panel admin-applicant-panel">
                <header className="admin-panel-heading">
                  <div><h2>Dokumen Persyaratan</h2><p>Dokumen yang diunggah calon siswa.</p></div>
                </header>
                <p className="admin-empty-state">Belum ada dokumen persyaratan yang tersimpan pada sistem.</p>
              </section>
            </div>

            <aside className="admin-applicant-detail-aside">
              <section className="admin-panel admin-applicant-panel">
                <header className="admin-panel-heading"><div><h2>Pilihan Jurusan</h2></div></header>
                <div className="admin-applicant-major">
                  <span>Pilihan jurusan</span>
                  {applicant.major_code && <strong>{applicant.major_code}</strong>}
                  <p>{applicant.major_name || "Belum memilih jurusan"}</p>
                </div>
              </section>

              <section className="admin-panel admin-applicant-panel">
                <header className="admin-panel-heading">
                  <div><h2>Ringkasan Verifikasi</h2></div>
                </header>
                <div className="admin-verification-state">
                  <span aria-hidden="true">{status === "verified" || status === "passed" ? "✓" : "◷"}</span>
                  <div>
                    <strong>{statusLabel}</strong>
                    <p>
                      {status === "pending_verification"
                        ? "Pendaftaran menunggu pemeriksaan panitia."
                        : status === "verified"
                          ? "Status pendaftaran telah diverifikasi."
                          : status === "passed"
                            ? "Pendaftar dinyatakan lolos seleksi."
                            : "Pendaftar dinyatakan tidak lolos seleksi."}
                    </p>
                  </div>
                </div>
                <div className="admin-verification-timeline">
                  <span aria-hidden="true">✓</span>
                  <div><strong>Pendaftaran dikirim</strong><small>{formatDate(registrationDate)}</small></div>
                </div>
                <div className="admin-verification-timeline">
                  <span aria-hidden="true">{status === "pending_verification" ? "◷" : "✓"}</span>
                  <div><strong>{statusLabel}</strong><small>Pembaruan terakhir {formatDate(lastUpdated)}</small></div>
                </div>
              </section>
            </aside>
          </div>

          <footer className="admin-dashboard-footer">
            <span>Masuk sebagai <strong>{admin.email}</strong></span>
            <span>Sesi berakhir otomatis setelah 8 jam.</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
