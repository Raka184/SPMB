import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminSidebar from "@/app/admin/AdminSidebar";
import PrincipalLogoutButton from "@/app/kepala-sekolah/LogoutButton";
import SchoolMark from "@/app/components/SchoolMark";
import db from "@/app/lib/db";
import { findPrincipalSession, PRINCIPAL_SESSION_COOKIE } from "@/app/lib/principal-session";

export const metadata = {
  title: "Dashboard Kepala Sekolah | SMK Nan Jaya",
  description: "Ringkasan penerimaan siswa baru SMK Nan Jaya.",
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

function formatStatus(value) {
  return {
    pending_verification: "Menunggu verifikasi",
    verified: "Terverifikasi",
    passed: "Lolos seleksi",
    not_passed: "Tidak lolos",
  }[value] || "Menunggu verifikasi";
}

function createTrendPath(values) {
  const maxValue = Math.max(1, ...values);
  const points = values.map((value, index) => ({
    x: 20 + (460 * index) / Math.max(1, values.length - 1),
    y: 112 - (value / maxValue) * 88,
  }));
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");

  return { line, area: `20,120 ${line} 480,120`, points };
}

export default async function PrincipalPortalPage({ searchParams }) {
  const cookieStore = await cookies();
  const principal = await findPrincipalSession(cookieStore.get(PRINCIPAL_SESSION_COOKIE)?.value);
  if (!principal) redirect("/kepala-sekolah/login");

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const searchValue = search ? `%${search}%` : null;
  const [[summaryRows], [capacityRows], [majorRows], [weeklyRows], [recentStudents], [settingRows]] = await Promise.all([
    db.execute(
      `SELECT COUNT(*) AS total,
              SUM(spmb_applications.status = 'passed') AS passed,
              SUM(spmb_applications.status = 'pending_verification') AS pending,
              SUM(spmb_applications.status = 'verified') AS verified
       FROM users
       LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
       WHERE users.role = 'student'`,
    ),
    db.execute(
      `SELECT COALESCE(SUM(capacity), 0) AS total_capacity,
              (SELECT COUNT(*) FROM spmb_applications WHERE major_id IS NOT NULL) AS assigned
       FROM spmb_majors WHERE is_active = TRUE`,
    ),
    db.execute(
      `SELECT spmb_majors.id, spmb_majors.name, spmb_majors.capacity,
              COUNT(spmb_applications.id) AS applicant_count
       FROM spmb_majors
       LEFT JOIN spmb_applications ON spmb_applications.major_id = spmb_majors.id
       WHERE spmb_majors.is_active = TRUE
       GROUP BY spmb_majors.id
       ORDER BY applicant_count DESC, spmb_majors.name ASC
       LIMIT 6`,
    ),
    db.execute(
      `SELECT TIMESTAMPDIFF(
         WEEK,
         DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY),
         DATE_SUB(DATE(users.created_at), INTERVAL WEEKDAY(users.created_at) DAY)
       ) AS week_offset, COUNT(*) AS total
       FROM users
       WHERE users.role = 'student'
         AND users.created_at >= DATE_SUB(
           DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY),
           INTERVAL 6 WEEK
         )
       GROUP BY week_offset
       ORDER BY week_offset ASC`,
    ),
    db.execute(
      `SELECT users.full_name, users.nisn, users.email, users.created_at,
              spmb_applications.status, spmb_majors.name AS major_name
       FROM users
       LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
       LEFT JOIN spmb_majors ON spmb_majors.id = spmb_applications.major_id
       WHERE users.role = 'student'
         AND (? IS NULL OR users.full_name LIKE ? OR users.email LIKE ? OR users.nisn LIKE ?)
       ORDER BY users.created_at DESC
       LIMIT 8`,
      [searchValue, searchValue, searchValue, searchValue],
    ),
    db.execute("SELECT setting_value FROM spmb_settings WHERE setting_key = 'academic_year' LIMIT 1"),
  ]);
  const summary = summaryRows[0];
  const totalCapacity = Number(capacityRows[0].total_capacity);
  const totalAssigned = Number(capacityRows[0].assigned);
  const availableCapacity = Math.max(0, totalCapacity - totalAssigned);
  const academicYear = settingRows[0]?.setting_value || "2026/2027";
  const firstName = principal.full_name.trim().split(/\s+/)[0];
  const majorTotal = majorRows.reduce((total, row) => total + Number(row.applicant_count), 0);
  const weeklyByOffset = Object.fromEntries(
    weeklyRows.map((row) => [Number(row.week_offset), Number(row.total)]),
  );
  const weeklyTotals = Array.from({ length: 7 }, (_, index) => weeklyByOffset[index - 6] || 0);
  const trend = createTrendPath(weeklyTotals);
  const majorColors = ["#13b9c7", "#f2a325", "#17304e", "#ed7583", "#75a97c", "#826cba"];
  const distributionStops = majorRows
    .reduce((segments, major) => {
      const start = segments.at(-1)?.end || 0;
      const end = start + (majorTotal ? (Number(major.applicant_count) / majorTotal) * 100 : 0);
      return [...segments, { start, end }];
    }, [])
    .map(({ start, end }, index) => `${majorColors[index % majorColors.length]} ${start}% ${end}%`);

  return (
    <main className="admin-dashboard principal-portal">
      <header className="admin-topbar">
        <Link aria-label="Dashboard kepala sekolah" className="admin-brand" href="/kepala-sekolah">
          <SchoolMark />
          <span>SPMB SEKOLAH<small>SMK NAN JAYA</small></span>
        </Link>
        <form action="/kepala-sekolah" className="admin-search" role="search">
          <svg aria-hidden="true" fill="none" viewBox="0 0 20 20"><circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.6" /><path d="m13.2 13.2 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" /></svg>
          <input aria-label="Cari pendaftar" defaultValue={search} maxLength={100} name="q" placeholder="Cari nama, email, atau NISN..." type="search" />
          <button type="submit">Cari</button>
        </form>
        <div className="admin-topbar-user">
          <span aria-hidden="true" className="admin-topbar-avatar">{firstName.charAt(0).toUpperCase()}</span>
          <span className="admin-topbar-name">{firstName}<small>Kepala Sekolah</small></span>
          <PrincipalLogoutButton />
        </div>
      </header>

      <div className="admin-dashboard-layout">
        <AdminSidebar
          admin={principal}
          basePath="/kepala-sekolah"
          currentSection="dashboard"
          roleLabel="Kepala Sekolah"
        />
        <section aria-labelledby="principal-dashboard-title" className="admin-dashboard-content principal-dashboard-content">
          <div className="admin-dashboard-heading">
            <div>
              <h1 id="principal-dashboard-title">Ringkasan Penerimaan Siswa Baru</h1>
              <p>Tahun Akademik {academicYear} <span aria-hidden="true">·</span> Pemantauan SPMB sekolah</p>
            </div>
            <span className="admin-updated-badge"><span aria-hidden="true" />Data terkini</span>
          </div>

          <div aria-label="Ringkasan penerimaan" className="admin-stat-grid">
            <article className="admin-stat-card"><div className="admin-stat-card-heading"><span>Total Pendaftar</span><span aria-hidden="true" className="admin-stat-icon admin-stat-icon-cyan">♙</span></div><strong>{Number(summary.total).toLocaleString("id-ID")}</strong><span className="admin-stat-note">Akun calon murid terdaftar</span></article>
            <article className="admin-stat-card"><div className="admin-stat-card-heading"><span>Lolos Seleksi</span><span aria-hidden="true" className="admin-stat-icon admin-stat-icon-green">✓</span></div><strong>{Number(summary.passed || 0).toLocaleString("id-ID")}</strong><span className="admin-stat-note">Hasil seleksi yang ditetapkan</span></article>
            <article className="admin-stat-card"><div className="admin-stat-card-heading"><span>Menunggu Verifikasi</span><span aria-hidden="true" className="admin-stat-icon admin-stat-icon-orange">◎</span></div><strong>{Number(summary.pending || 0).toLocaleString("id-ID")}</strong><span className="admin-stat-note">Perlu ditinjau panitia</span></article>
            <article className="admin-stat-card"><div className="admin-stat-card-heading"><span>Kuota Tersisa</span><span aria-hidden="true" className="admin-stat-icon admin-stat-icon-cyan">◉</span></div><strong>{availableCapacity.toLocaleString("id-ID")}</strong><span className="admin-stat-note">Dari kuota jurusan aktif</span></article>
          </div>

          <div className="admin-analytics-grid principal-analytics-grid">
            <section aria-labelledby="principal-trend-title" className="admin-panel admin-trend-panel">
              <header className="admin-panel-heading">
                <div><h2 id="principal-trend-title">Tren Pendaftar per Minggu</h2><p>Jumlah akun calon siswa yang dibuat per minggu</p></div>
                <span className="admin-panel-filter">7 minggu terakhir</span>
              </header>
              <div className="admin-trend-chart">
                <svg aria-label={`Grafik tren pendaftar: ${weeklyTotals.join(", ")}`} role="img" viewBox="0 0 500 150">
                  <line x1="20" x2="480" y1="30" y2="30" />
                  <line x1="20" x2="480" y1="75" y2="75" />
                  <line x1="20" x2="480" y1="120" y2="120" />
                  <polygon className="admin-chart-area" points={trend.area} />
                  <polyline className="admin-chart-line" points={trend.line} />
                  {trend.points.map(({ x, y }, index) => <circle className="admin-chart-point" cx={x} cy={y} key={index} r="3" />)}
                </svg>
                <div aria-hidden="true" className="admin-chart-labels">
                  {weeklyTotals.map((_, index) => <span key={index}>Mgg {index + 1}</span>)}
                </div>
              </div>
            </section>

            <section aria-labelledby="principal-distribution-title" className="admin-panel admin-distribution-panel">
              <header className="admin-panel-heading">
                <div><h2 id="principal-distribution-title">Distribusi Jurusan</h2><p>Pendaftar berdasarkan pilihan jurusan</p></div>
              </header>
              <div className="admin-distribution-content">
                <div
                  aria-label={`${majorTotal.toLocaleString("id-ID")} pendaftar memilih jurusan`}
                  className="admin-donut-chart"
                  role="img"
                  style={{ "--admin-donut-stops": distributionStops.length ? distributionStops.join(", ") : "#e8edf3 0% 100%" }}
                >
                  <span>{majorTotal.toLocaleString("id-ID")}<small>Pendaftar</small></span>
                </div>
                <ul className="admin-distribution-legend">
                  {majorRows.map((major, index) => (
                    <li key={major.id}>
                      <span aria-hidden="true" style={{ "--admin-legend-color": majorColors[index % majorColors.length] }} />
                      <span>{major.name}</span><strong>{Number(major.applicant_count).toLocaleString("id-ID")}</strong>
                    </li>
                  ))}
                  {!majorRows.length && <li>Belum ada jurusan</li>}
                </ul>
              </div>
            </section>
          </div>

          <section className="admin-panel principal-recent-panel">
            <header className="admin-panel-heading"><div><h2>Pendaftar Terbaru</h2><p>Delapan akun calon murid terbaru.</p></div><Link href="/kepala-sekolah/pendaftar">Lihat semua →</Link></header>
            {recentStudents.length ? (
              <div className="admin-table-scroll">
                <table className="admin-students-table">
                  <thead><tr><th>Nama</th><th>Jurusan</th><th>Status</th><th>Tanggal</th></tr></thead>
                  <tbody>{recentStudents.map((student) => (
                    <tr key={student.nisn || student.email}>
                      <td><span className="admin-student-name"><span aria-hidden="true">{student.full_name.trim().charAt(0).toUpperCase()}</span>{student.full_name}</span></td>
                      <td>{student.major_name || "Belum dipilih"}</td>
                      <td>{formatStatus(student.status)}</td>
                      <td>{formatDate(student.created_at)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="admin-empty-state">Belum ada pendaftar yang cocok dengan pencarian.</p>}
          </section>
          <footer className="admin-dashboard-footer">Masuk sebagai <strong>{principal.email}</strong> · Sesi berakhir otomatis setelah 8 jam.</footer>
        </section>
      </div>
    </main>
  );
}
