import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AdminSidebar from "@/app/admin/AdminSidebar";
import PrincipalLogoutButton from "@/app/kepala-sekolah/LogoutButton";
import PrintReportButton from "@/app/kepala-sekolah/PrintReportButton";
import SchoolMark from "@/app/components/SchoolMark";
import db from "@/app/lib/db";
import { findPrincipalSession, PRINCIPAL_SESSION_COOKIE } from "@/app/lib/principal-session";

const sections = {
  pendaftar: { title: "Pendaftar", description: "Tinjau data calon murid yang telah mendaftar." },
  seleksi: { title: "Seleksi", description: "Pantau status verifikasi dan hasil seleksi calon murid." },
  pengumuman: { title: "Pengumuman", description: "Lihat informasi penerimaan yang telah diterbitkan." },
  jurusan: { title: "Jurusan", description: "Pantau kuota dan distribusi pendaftar pada program keahlian." },
  laporan: { title: "Laporan", description: "Ringkasan penerimaan dan laporan yang siap dicetak." },
  pengaturan: { title: "Pengaturan", description: "Lihat informasi tahun ajaran dan jadwal penerimaan." },
};

const statusLabels = {
  pending_verification: "Menunggu verifikasi",
  verified: "Terverifikasi",
  passed: "Lolos seleksi",
  not_passed: "Tidak lolos",
};

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function Table({ headers, children }) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-students-table admin-workspace-table">
        <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { section } = await params;
  return { title: `${sections[section]?.title || "Portal"} | Kepala Sekolah SMK Nan Jaya` };
}

export default async function PrincipalSectionPage({ params, searchParams }) {
  const { section } = await params;
  if (!sections[section]) notFound();

  const cookieStore = await cookies();
  const principal = await findPrincipalSession(cookieStore.get(PRINCIPAL_SESSION_COOKIE)?.value);
  if (!principal) redirect("/kepala-sekolah/login");

  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const searchValue = search ? `%${search}%` : null;
  let content;

  if (section === "pendaftar" || section === "seleksi") {
    const [students] = await db.execute(
      `SELECT users.full_name, users.nisn, users.email, users.phone, users.created_at,
              spmb_applications.status, spmb_applications.updated_at,
              spmb_majors.name AS major_name
       FROM users
       LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
       LEFT JOIN spmb_majors ON spmb_majors.id = spmb_applications.major_id
       WHERE users.role = 'student'
         AND (? IS NULL OR users.full_name LIKE ? OR users.email LIKE ? OR users.nisn LIKE ?)
       ORDER BY users.created_at DESC
       LIMIT 200`,
      [searchValue, searchValue, searchValue, searchValue],
    );
    content = (
      <>
        {section === "pendaftar" && (
          <form action="/kepala-sekolah/pendaftar" className="admin-workspace-search">
            <label><span>Cari nama, email, atau NISN</span><input defaultValue={search} maxLength={100} name="q" placeholder="Masukkan kata kunci" /></label>
            <button className="admin-action-button" type="submit">Cari</button>
            {search && <Link href="/kepala-sekolah/pendaftar">Hapus pencarian</Link>}
          </form>
        )}
        <section className="admin-panel admin-workspace-panel">
          <header className="admin-panel-heading"><div><h2>{section === "seleksi" ? "Status dan hasil seleksi" : "Data calon murid"}</h2><p>{students.length} akun ditampilkan · Maksimal 200 akun terbaru · Tampilan baca saja</p></div></header>
          {students.length ? (
            <Table headers={["Nama", "NISN", "Email", "Jurusan", "Status", ...(section === "seleksi" ? ["Pembaruan"] : ["Tanggal daftar"])]}>
              {students.map((student) => (
                <tr key={student.nisn || student.email}>
                  <td><span className="admin-student-name"><span aria-hidden="true">{student.full_name.trim().charAt(0).toUpperCase()}</span>{student.full_name}</span></td>
                  <td>{student.nisn || "—"}</td><td>{student.email}</td><td>{student.major_name || "Belum dipilih"}</td>
                  <td><span className={`admin-account-status status-${student.status || "pending_verification"}`}>{statusLabels[student.status] || statusLabels.pending_verification}</span></td>
                  <td>{formatDate(section === "seleksi" ? student.updated_at : student.created_at)}</td>
                </tr>
              ))}
            </Table>
          ) : <p className="admin-empty-state">Belum ada akun calon murid yang cocok.</p>}
        </section>
      </>
    );
  } else if (section === "pengumuman") {
    const [announcements] = await db.execute(
      `SELECT title, body, published_at
       FROM spmb_announcements
       WHERE is_published = TRUE
       ORDER BY published_at DESC, id DESC`,
    );
    content = announcements.length ? (
      <div className="student-announcements-page">
        {announcements.map((announcement) => (
          <article className="admin-panel student-announcement-card" key={`${announcement.title}-${announcement.published_at}`}>
            <span>{formatDate(announcement.published_at)}</span><h2>{announcement.title}</h2><p>{announcement.body}</p>
          </article>
        ))}
      </div>
    ) : <section className="admin-panel"><p className="admin-empty-state">Belum ada pengumuman yang diterbitkan untuk publik.</p></section>;
  } else if (section === "jurusan") {
    const [majors] = await db.execute(
      `SELECT spmb_majors.code, spmb_majors.name, spmb_majors.capacity,
              COUNT(spmb_applications.id) AS applicant_count
       FROM spmb_majors
       LEFT JOIN spmb_applications ON spmb_applications.major_id = spmb_majors.id
       WHERE spmb_majors.is_active = TRUE
       GROUP BY spmb_majors.id
       ORDER BY spmb_majors.name`,
    );
    content = (
      <section className="admin-panel admin-workspace-panel">
        <header className="admin-panel-heading"><div><h2>Kuota program keahlian</h2><p>Jumlah pendaftar dan kuota pada setiap jurusan aktif.</p></div></header>
        {majors.length ? (
          <Table headers={["Kode", "Program keahlian", "Pendaftar", "Kuota", "Sisa kuota"]}>
            {majors.map((major) => {
              const remaining = Math.max(0, Number(major.capacity) - Number(major.applicant_count));
              return <tr key={major.code}><td>{major.code}</td><td><strong>{major.name}</strong></td><td>{Number(major.applicant_count).toLocaleString("id-ID")}</td><td>{Number(major.capacity).toLocaleString("id-ID")}</td><td>{remaining.toLocaleString("id-ID")}</td></tr>;
            })}
          </Table>
        ) : <p className="admin-empty-state">Belum ada jurusan aktif.</p>}
      </section>
    );
  } else if (section === "laporan") {
    const [[summaryRows], [majorRows]] = await Promise.all([
      db.execute(
        `SELECT COUNT(*) AS total,
                SUM(spmb_applications.status = 'pending_verification') AS pending,
                SUM(spmb_applications.status = 'verified') AS verified,
                SUM(spmb_applications.status = 'passed') AS passed,
                SUM(spmb_applications.status = 'not_passed') AS not_passed
         FROM users
         LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
         WHERE users.role = 'student'`,
      ),
      db.execute(
        `SELECT spmb_majors.name, spmb_majors.capacity, COUNT(spmb_applications.id) AS applicant_count
         FROM spmb_majors
         LEFT JOIN spmb_applications ON spmb_applications.major_id = spmb_majors.id
         WHERE spmb_majors.is_active = TRUE
         GROUP BY spmb_majors.id ORDER BY spmb_majors.name`,
      ),
    ]);
    const summary = summaryRows[0];
    content = (
      <div className="principal-report">
        <section className="admin-panel admin-workspace-panel">
          <header className="admin-panel-heading"><div><h2>Rekap status pendaftar</h2><p>Ringkasan data pendaftaran yang tercatat.</p></div><PrintReportButton /></header>
          <div className="principal-report-cards">
            {[
              ["Total pendaftar", summary.total],
              ["Menunggu verifikasi", summary.pending],
              ["Terverifikasi", summary.verified],
              ["Lolos seleksi", summary.passed],
              ["Tidak lolos", summary.not_passed],
            ].map(([label, value]) => <div className="admin-stat-card" key={label}><span>{label}</span><strong>{Number(value || 0).toLocaleString("id-ID")}</strong></div>)}
          </div>
        </section>
        <section className="admin-panel admin-workspace-panel">
          <header className="admin-panel-heading"><div><h2>Rekap kuota jurusan</h2><p>Perbandingan pendaftar dengan daya tampung aktif.</p></div></header>
          {majorRows.length ? (
            <Table headers={["Program keahlian", "Pendaftar", "Kuota", "Sisa kuota"]}>
              {majorRows.map((major) => <tr key={major.name}><td>{major.name}</td><td>{Number(major.applicant_count).toLocaleString("id-ID")}</td><td>{Number(major.capacity).toLocaleString("id-ID")}</td><td>{Math.max(0, Number(major.capacity) - Number(major.applicant_count)).toLocaleString("id-ID")}</td></tr>)}
            </Table>
          ) : <p className="admin-empty-state">Belum ada data kuota jurusan.</p>}
        </section>
      </div>
    );
  } else {
    const [settingsRows] = await db.execute(
      `SELECT setting_key, setting_value FROM spmb_settings
       WHERE setting_key IN ('academic_year', 'registration_open_date', 'registration_close_date', 'school_contact_email', 'school_contact_phone')`,
    );
    const settings = Object.fromEntries(settingsRows.map(({ setting_key, setting_value }) => [setting_key, setting_value]));
    content = (
      <section className="admin-panel student-detail-panel">
        <header className="admin-panel-heading"><div><h2>Informasi sekolah dan penerimaan</h2><p>Pengaturan berikut dikelola oleh administrator SPMB.</p></div></header>
        <dl className="student-application-details">
          <div><dt>Tahun ajaran</dt><dd>{settings.academic_year || "2026/2027"}</dd></div>
          <div><dt>Pendaftaran dibuka</dt><dd>{settings.registration_open_date ? formatDate(settings.registration_open_date) : "Belum ditentukan"}</dd></div>
          <div><dt>Pendaftaran ditutup</dt><dd>{settings.registration_close_date ? formatDate(settings.registration_close_date) : "Belum ditentukan"}</dd></div>
          <div><dt>Email kontak</dt><dd>{settings.school_contact_email || "Belum ditentukan"}</dd></div>
          <div><dt>Telepon / WhatsApp</dt><dd>{settings.school_contact_phone || "Belum ditentukan"}</dd></div>
        </dl>
      </section>
    );
  }

  const firstName = principal.full_name.trim().split(/\s+/)[0];
  return (
    <main className="admin-dashboard principal-portal">
      <header className="admin-topbar">
        <Link aria-label="Dashboard kepala sekolah" className="admin-brand" href="/kepala-sekolah"><SchoolMark /><span>SPMB SEKOLAH<small>SMK NAN JAYA</small></span></Link>
        <form action="/kepala-sekolah/pendaftar" className="admin-search" role="search">
          <svg aria-hidden="true" fill="none" viewBox="0 0 20 20"><circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.6" /><path d="m13.2 13.2 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" /></svg>
          <input aria-label="Cari pendaftar" defaultValue={section === "pendaftar" ? search : ""} maxLength={100} name="q" placeholder="Cari nama, email, atau NISN..." type="search" />
          <button type="submit">Cari</button>
        </form>
        <div className="admin-topbar-user"><span aria-hidden="true" className="admin-topbar-avatar">{firstName.charAt(0).toUpperCase()}</span><span className="admin-topbar-name">{firstName}<small>Kepala Sekolah</small></span><PrincipalLogoutButton /></div>
      </header>
      <div className="admin-dashboard-layout">
        <AdminSidebar admin={principal} basePath="/kepala-sekolah" currentSection={section} roleLabel="Kepala Sekolah" />
        <section aria-labelledby="principal-section-title" className="admin-workspace-content principal-dashboard-content">
          <div className="admin-dashboard-heading">
            <div><h1 id="principal-section-title">{sections[section].title}</h1><p>{sections[section].description}</p></div>
            <span className="admin-updated-badge"><span aria-hidden="true" />Tampilan baca saja</span>
          </div>
          {content}
          <footer className="admin-dashboard-footer">Masuk sebagai <strong>{principal.email}</strong> · Sesi berakhir otomatis setelah 8 jam.</footer>
        </section>
      </div>
    </main>
  );
}
