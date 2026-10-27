import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import StudentPortalFrame from "@/app/siswa/PortalFrame";
import { applicationStatusLabels, formatStudentDate } from "@/app/siswa/navigation";
import db from "@/app/lib/db";
import { findStudentSession, STUDENT_SESSION_COOKIE } from "@/app/lib/student-session";

export const metadata = {
  title: "Dashboard Siswa | SPMB SMK Nan Jaya",
  description: "Pantau status pendaftaran dan informasi penerimaan SMK Nan Jaya.",
};

export default async function StudentDashboardPage({ searchParams }) {
  const cookieStore = await cookies();
  const student = await findStudentSession(cookieStore.get(STUDENT_SESSION_COOKIE)?.value);
  if (!student) redirect("/");

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const searchValue = search ? `%${search}%` : null;
  const [[applications], [settings], [announcements]] = await Promise.all([
    db.execute(
      `SELECT spmb_applications.status, spmb_applications.created_at,
              spmb_applications.updated_at, spmb_majors.name AS major_name
       FROM spmb_applications
       LEFT JOIN spmb_majors ON spmb_majors.id = spmb_applications.major_id
       WHERE spmb_applications.user_id = ?
       LIMIT 1`,
      [student.id],
    ),
    db.execute("SELECT setting_key, setting_value FROM spmb_settings WHERE setting_key = 'academic_year'"),
    db.execute(
      `SELECT id, title, body, published_at
       FROM spmb_announcements
       WHERE is_published = TRUE
         AND (? IS NULL OR title LIKE ? OR body LIKE ?)
       ORDER BY published_at DESC, id DESC
       LIMIT 3`,
      [searchValue, searchValue, searchValue],
    ),
  ]);
  const application = applications[0] || null;
  const status = applicationStatusLabels[application?.status] || applicationStatusLabels.pending_verification;
  const academicYear = settings[0]?.setting_value || "2026/2027";
  const firstName = student.full_name.trim().split(/\s+/)[0];

  return (
    <StudentPortalFrame currentSection="dashboard" student={student}>
      <section aria-labelledby="student-dashboard-title" className="admin-dashboard-content student-dashboard-content">
        <div className="admin-dashboard-heading">
          <div>
            <h1 id="student-dashboard-title">Selamat datang, {firstName}</h1>
            <p>Tahun Ajaran {academicYear} <span aria-hidden="true">·</span> Ringkasan pendaftaranmu</p>
          </div>
          <span className="admin-updated-badge"><span aria-hidden="true" />Data akun</span>
        </div>

        <div aria-label="Ringkasan pendaftaran" className="admin-stat-grid student-stat-grid">
          <article className="admin-stat-card">
            <div className="admin-stat-card-heading"><span>Status pendaftaran</span><span aria-hidden="true" className="admin-stat-icon admin-stat-icon-cyan">◎</span></div>
            <strong className="student-status-value">{status}</strong>
            <span className="admin-stat-note">Tahap pendaftaran saat ini</span>
          </article>
          <article className="admin-stat-card">
            <div className="admin-stat-card-heading"><span>Program pilihan</span><span aria-hidden="true" className="admin-stat-icon admin-stat-icon-orange">◇</span></div>
            <strong className="student-status-value">{application?.major_name || "Belum dipilih"}</strong>
            <span className="admin-stat-note">Informasi pilihan dari panitia SPMB</span>
          </article>
          <article className="admin-stat-card">
            <div className="admin-stat-card-heading"><span>Tanggal mendaftar</span><span aria-hidden="true" className="admin-stat-icon admin-stat-icon-green">◷</span></div>
            <strong className="student-status-value">{formatStudentDate(application?.created_at)}</strong>
            <span className="admin-stat-note">Data akun SPMB kamu</span>
          </article>
        </div>

        <div className="student-dashboard-panels">
          <section className="admin-panel student-progress-panel">
            <header className="admin-panel-heading">
              <div><h2>Perjalanan pendaftaran</h2><p>Pantau informasi terbaru tentang prosesmu.</p></div>
              <span className={`admin-account-status status-${application?.status || "pending_verification"}`}>{status}</span>
            </header>
            <ol className="student-application-steps">
              <li className="is-complete"><span>1</span><div><strong>Akun pendaftaran dibuat</strong><small>{formatStudentDate(application?.created_at)}</small></div></li>
              <li className={application?.status !== "pending_verification" ? "is-complete" : "is-current"}><span>2</span><div><strong>Verifikasi data</strong><small>{application?.status === "pending_verification" ? "Menunggu pemeriksaan panitia" : "Data telah ditinjau panitia"}</small></div></li>
              <li className={["passed", "not_passed"].includes(application?.status) ? "is-complete" : ""}><span>3</span><div><strong>Hasil seleksi</strong><small>{["passed", "not_passed"].includes(application?.status) ? status : "Hasil akan diumumkan melalui portal"}</small></div></li>
            </ol>
            <Link className="student-inline-link" href="/siswa/pendaftaran">Lihat detail pendaftaran <span aria-hidden="true">→</span></Link>
          </section>

          <section className="admin-panel student-announcement-panel">
            <header className="admin-panel-heading">
              <div>
                <h2>{search ? "Hasil pencarian pengumuman" : "Pengumuman terbaru"}</h2>
                <p>{search ? `Informasi yang cocok dengan “${search}”.` : "Informasi resmi penerimaan siswa baru."}</p>
              </div>
              <Link className="student-inline-link" href="/siswa/pengumuman">Semua</Link>
            </header>
            {announcements.length ? (
              <ul className="student-announcement-list">
                {announcements.map((announcement) => (
                  <li key={announcement.id}>
                    <span>{formatStudentDate(announcement.published_at)}</span>
                    <strong>{announcement.title}</strong>
                    <p>{announcement.body}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="admin-empty-state">{search ? "Tidak ada pengumuman yang cocok." : "Belum ada pengumuman terbaru."}</p>}
          </section>
        </div>
      </section>
    </StudentPortalFrame>
  );
}
