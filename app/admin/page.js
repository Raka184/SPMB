import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminLogoutButton from "./LogoutButton";
import AdminSidebar from "./AdminSidebar";
import SchoolMark from "@/app/components/SchoolMark";
import {
  findAdminSession,
  ADMIN_SESSION_COOKIE,
} from "@/app/lib/admin-session";
import db from "@/app/lib/db";

export const metadata = {
  title: "Dashboard Admin | SMK Nan Jaya",
  description: "Dashboard administrator SPMB SMK Nan Jaya.",
};

function createTrendPath(values) {
  const maxValue = Math.max(1, ...values);
  const points = values.map((value, index) => ({
    x: 20 + (460 * index) / Math.max(1, values.length - 1),
    y: 112 - (value / maxValue) * 88,
  }));
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");

  return {
    line,
    area: `20,120 ${line} 480,120`,
    points,
  };
}

export default async function AdminPortalPage({ searchParams }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const admin = await findAdminSession(token);

  if (!admin) redirect("/admin/login");

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const showAll = params.all === "1";
  const selectedWeekIndex = typeof params.week === "string" && /^[0-6]$/.test(params.week)
    ? Number(params.week)
    : null;
  const [settingRows] = await db.execute(
    "SELECT setting_value FROM spmb_settings WHERE setting_key = 'academic_year' LIMIT 1",
  );
  const academicYear = settingRows[0]?.setting_value || "2026/2027";
  const [summaryRows] = await db.execute(
    `SELECT COUNT(*) AS total_students,
       SUM(COALESCE(spmb_applications.status, 'pending_verification') = 'passed') AS passed_students,
       SUM(COALESCE(spmb_applications.status, 'pending_verification') = 'pending_verification') AS pending_students,
       (SELECT COALESCE(SUM(capacity), 0) FROM spmb_majors WHERE is_active = TRUE) AS total_capacity
     FROM users
     LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
     WHERE users.role = 'student'`,
  );
  const [majorRows] = await db.execute(
    `SELECT spmb_majors.id, spmb_majors.name, COUNT(spmb_applications.id) AS total
     FROM spmb_majors
     LEFT JOIN spmb_applications ON spmb_applications.major_id = spmb_majors.id
     GROUP BY spmb_majors.id
     ORDER BY total DESC, spmb_majors.name ASC
     LIMIT 5`,
  );
  const [weeklyRows] = await db.execute(
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
  );
  let selectedWeekStudents = [];
  if (selectedWeekIndex !== null) {
    const daysAgo = (6 - selectedWeekIndex) * 7;
    [selectedWeekStudents] = await db.execute(
      `SELECT users.id AS user_id, users.full_name, users.nisn, users.email, users.created_at,
              spmb_applications.status, spmb_majors.name AS major_name
       FROM users
       LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
       LEFT JOIN spmb_majors ON spmb_majors.id = spmb_applications.major_id
       WHERE users.role = 'student'
         AND users.created_at >= DATE_SUB(
           DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY),
           INTERVAL ? DAY
         )
         AND users.created_at < DATE_ADD(
           DATE_SUB(
             DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY),
             INTERVAL ? DAY
           ),
           INTERVAL 7 DAY
         )
       ORDER BY users.created_at DESC`,
      [daysAgo, daysAgo],
    );
  }
  const studentSearch = search ? `%${search}%` : null;
  const [recentStudents] = await db.execute(
    `SELECT users.id AS user_id, users.full_name, users.nisn, users.email, users.created_at,
            spmb_applications.status, spmb_majors.name AS major_name
     FROM users
     LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
     LEFT JOIN spmb_majors ON spmb_majors.id = spmb_applications.major_id
     WHERE users.role = 'student'
       AND (? IS NULL OR users.full_name LIKE ? OR users.email LIKE ? OR users.nisn LIKE ?)
     ORDER BY users.created_at DESC
     LIMIT ${showAll ? 50 : 8}`,
    [studentSearch, studentSearch, studentSearch, studentSearch],
  );

  const summary = summaryRows[0];
  const remainingQuota = Math.max(
    0,
    Number(summary.total_capacity || 0) - Number(summary.passed_students || 0),
  );
  const majorTotal = majorRows.reduce((total, row) => total + Number(row.total), 0);
  const weeklyByOffset = Object.fromEntries(
    weeklyRows.map((row) => [Number(row.week_offset), Number(row.total)]),
  );
  const weeklyTotals = Array.from(
    { length: 7 },
    (_, index) => weeklyByOffset[index - 6] || 0,
  );
  const listQuery = new URLSearchParams({
    ...(search ? { q: search } : {}),
    ...(!showAll ? { all: "1" } : {}),
  }).toString();
  const getWeekHref = (index) => {
    const query = new URLSearchParams({
      ...(search ? { q: search } : {}),
      ...(showAll ? { all: "1" } : {}),
      week: String(index),
    }).toString();
    return `/admin?${query}#weekly-students`;
  };

  const majorColors = ["#13b9c7", "#f2a325", "#17304e", "#ed7583", "#75a97c"];
  const distributionStops = majorRows
    .reduce((segments, major, index) => {
      const start = segments.at(-1)?.end || 0;
      const count = Number(major.total);
      const end = start + (majorTotal ? (count / majorTotal) * 100 : 0);
      return [...segments, { color: majorColors[index % majorColors.length], start, end }];
    }, [])
    .map(({ color, start, end }) => `${color} ${start}% ${end}%`);
  const trend = createTrendPath(weeklyTotals);
  const formatDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const firstName = admin.full_name.trim().split(/\s+/)[0];

  return (
    <main className="admin-dashboard">
      <header className="admin-topbar">
        <Link aria-label="Dashboard admin SMK Nan Jaya" className="admin-brand" href="/admin">
          <SchoolMark />
          <span>SPMB ADMIN<small>SMK NAN JAYA</small></span>
        </Link>
        <form action="/admin" className="admin-search" role="search">
          <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
            <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.6" />
            <path d="m13.2 13.2 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
          </svg>
          <input
            aria-label="Cari pendaftar"
            defaultValue={search}
            maxLength={100}
            name="q"
            placeholder="Cari nama, email, atau NISN..."
            type="search"
          />
          <button type="submit">Cari</button>
        </form>
        <div className="admin-topbar-user">
          <span aria-hidden="true" className="admin-topbar-avatar">
            {firstName.charAt(0).toUpperCase()}
          </span>
          <span className="admin-topbar-name">{firstName}<small>Administrator</small></span>
          <AdminLogoutButton />
        </div>
      </header>

      <div className="admin-dashboard-layout">
        <AdminSidebar admin={admin} currentSection="dashboard" />

        <section aria-labelledby="admin-dashboard-title" className="admin-dashboard-content" id="overview">
          <div className="admin-dashboard-heading">
            <div>
              <h1 id="admin-dashboard-title">Selamat Datang, {admin.full_name}</h1>
              <p>Tahun Akademik Penerimaan {academicYear} <span aria-hidden="true">•</span> Ringkasan penerimaan SPMB</p>
            </div>
            <Link className="admin-action-button admin-download-button" href="/api/admin/reports">
              Ekspor Laporan (CSV)
            </Link>
          </div>

          <div aria-label="Ringkasan pendaftar" className="admin-stat-grid">
            <article className="admin-stat-card">
              <div className="admin-stat-card-heading">
                <span>Total Pendaftar</span>
                <span aria-hidden="true" className="admin-stat-icon admin-stat-icon-cyan">♙</span>
              </div>
              <strong>{Number(summary.total_students).toLocaleString("id-ID")}</strong>
              <span className="admin-stat-note">Seluruh akun calon siswa terdaftar</span>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-card-heading">
                <span>Lolos Seleksi</span>
                <span aria-hidden="true" className="admin-stat-icon admin-stat-icon-green">✓</span>
              </div>
              <strong>{Number(summary.passed_students || 0).toLocaleString("id-ID")}</strong>
              <span className="admin-stat-note">Pendaftar dengan hasil lolos</span>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-card-heading">
                <span>Menunggu Verifikasi</span>
                <span aria-hidden="true" className="admin-stat-icon admin-stat-icon-orange">◎</span>
              </div>
              <strong>{Number(summary.pending_students || 0).toLocaleString("id-ID")}</strong>
              <span className="admin-stat-note">Perlu diperiksa administrator</span>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-card-heading">
                <span>Kuota Tersisa</span>
                <span aria-hidden="true" className="admin-stat-icon admin-stat-icon-blue">▣</span>
              </div>
              <strong>{remainingQuota.toLocaleString("id-ID")}</strong>
              <span className="admin-stat-note">Kapasitas aktif setelah hasil seleksi</span>
            </article>
          </div>

          <div className="admin-analytics-grid" id="registration-stats">
            <section aria-labelledby="admin-trend-title" className="admin-panel admin-trend-panel">
              <header className="admin-panel-heading">
                <div>
                  <h2 id="admin-trend-title">Tren Pendaftar per Minggu</h2>
                  <p>Pilih minggu pada grafik untuk melihat daftar siswanya</p>
                </div>
                <span className="admin-panel-filter">7 minggu terakhir</span>
              </header>
              <div className="admin-trend-chart">
                <svg aria-label={`Grafik tren pendaftar: ${weeklyTotals.join(", ")}`} role="group" viewBox="0 0 500 150">
                  <line x1="20" x2="480" y1="30" y2="30" />
                  <line x1="20" x2="480" y1="75" y2="75" />
                  <line x1="20" x2="480" y1="120" y2="120" />
                  <polygon className="admin-chart-area" points={trend.area} />
                  <polyline className="admin-chart-line" points={trend.line} />
                  {trend.points.map(({ x, y }, index) => (
                    <a
                      aria-current={selectedWeekIndex === index ? "true" : undefined}
                      aria-label={`Lihat ${weeklyTotals[index]} siswa yang mendaftar pada minggu ${index + 1}`}
                      className="admin-chart-point-link"
                      href={getWeekHref(index)}
                      key={index}
                    >
                      <title>{`Minggu ${index + 1}: ${weeklyTotals[index]} pendaftar`}</title>
                      <text className="admin-chart-value" textAnchor="middle" x={x} y={Math.max(14, y - 9)}>
                        {weeklyTotals[index]}
                      </text>
                      <circle className="admin-chart-point" cx={x} cy={y} r={selectedWeekIndex === index ? "5" : "3"} />
                    </a>
                  ))}
                </svg>
                <nav aria-label="Pilih minggu untuk melihat daftar siswa" className="admin-chart-labels">
                  {weeklyTotals.map((_, index) => (
                    <a
                      aria-current={selectedWeekIndex === index ? "true" : undefined}
                      className="admin-chart-label-link"
                      href={getWeekHref(index)}
                      key={index}
                    >
                      Mgg {index + 1}
                    </a>
                  ))}
                </nav>
              </div>
            </section>

            <section aria-labelledby="admin-distribution-title" className="admin-panel admin-distribution-panel">
              <header className="admin-panel-heading">
                <div>
                  <h2 id="admin-distribution-title">Distribusi Jurusan</h2>
                  <p>Pendaftar berdasarkan pilihan jurusan</p>
                </div>
              </header>
              <div className="admin-distribution-content">
                <div
                  aria-label={`${majorTotal.toLocaleString("id-ID")} pendaftar memilih jurusan`}
                  className="admin-donut-chart"
                  role="img"
                  style={{
                    "--admin-donut-stops": distributionStops.length
                      ? distributionStops.join(", ")
                      : "#e8edf3 0% 100%",
                  }}
                >
                  <span>{majorTotal.toLocaleString("id-ID")}<small>Pendaftar</small></span>
                </div>
                <ul className="admin-distribution-legend">
                  {majorRows.map((major, index) => (
                    <li key={major.id}>
                      <span aria-hidden="true" style={{ "--admin-legend-color": majorColors[index % majorColors.length] }} />
                      <span>{major.name}</span>
                      <strong>{Number(major.total).toLocaleString("id-ID")}</strong>
                    </li>
                  ))}
                  {!majorRows.length && <li>Belum ada jurusan</li>}
                </ul>
              </div>
            </section>
          </div>

          {selectedWeekIndex !== null && (
            <section
              aria-labelledby="weekly-students-title"
              className="admin-panel admin-recent-panel"
              id="weekly-students"
            >
              <header className="admin-panel-heading">
                <div>
                  <h2 id="weekly-students-title">Pendaftar Minggu ke-{selectedWeekIndex + 1}</h2>
                  <p>{selectedWeekStudents.length.toLocaleString("id-ID")} siswa mendaftar pada minggu ini</p>
                </div>
                <Link className="admin-table-link" href="/admin#registration-stats">Tutup daftar</Link>
              </header>
              {selectedWeekStudents.length ? (
                <div className="admin-table-scroll">
                  <table className="admin-students-table">
                    <thead>
                      <tr>
                        <th scope="col">Nama</th>
                        <th scope="col">NISN</th>
                        <th scope="col">Email</th>
                        <th scope="col">Jurusan</th>
                        <th scope="col">Status</th>
                        <th scope="col">Tanggal Daftar</th>
                        <th scope="col">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedWeekStudents.map((student) => (
                        <tr key={student.user_id}>
                          <td>
                            <span className="admin-student-name">
                              <span aria-hidden="true">{student.full_name.trim().charAt(0).toUpperCase()}</span>
                              {student.full_name}
                            </span>
                          </td>
                          <td>{student.nisn || "—"}</td>
                          <td>{student.email}</td>
                          <td>{student.major_name || "Belum dipilih"}</td>
                          <td>
                            <span className={`admin-account-status status-${student.status || "pending_verification"}`}>
                              {{
                                pending_verification: "Menunggu verifikasi",
                                verified: "Terverifikasi",
                                passed: "Lolos seleksi",
                                not_passed: "Tidak lolos",
                              }[student.status] || "Menunggu verifikasi"}
                            </span>
                          </td>
                          <td>{formatDate.format(new Date(student.created_at))}</td>
                          <td>
                            <Link className="admin-detail-link" href={`/admin/pendaftar/${student.user_id}`}>
                              Lihat Detail
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="admin-empty-state">Belum ada siswa yang mendaftar pada minggu ini.</p>
              )}
            </section>
          )}

          <section aria-labelledby="recent-students-title" className="admin-panel admin-recent-panel" id="student-accounts">
            <header className="admin-panel-heading">
              <div>
                <h2 id="recent-students-title">Pendaftar Terbaru</h2>
                <p>
                  {search
                    ? `Menampilkan ${recentStudents.length.toLocaleString("id-ID")} hasil untuk “${search}”`
                    : showAll
                      ? `Menampilkan ${recentStudents.length.toLocaleString("id-ID")} akun calon siswa terbaru (maksimal 50)`
                      : `Menampilkan ${recentStudents.length.toLocaleString("id-ID")} dari ${Number(summary.total_students).toLocaleString("id-ID")} akun calon siswa terdaftar`}
                </p>
              </div>
              <a className="admin-table-link" href={`/admin${listQuery ? `?${listQuery}` : ""}#student-accounts`}>
                {showAll ? "Tampilkan ringkasan" : "Lihat Semua Pendaftar"}
                <span aria-hidden="true">→</span>
              </a>
            </header>
            {recentStudents.length ? (
              <div className="admin-table-scroll">
                <table className="admin-students-table">
                  <thead>
                    <tr>
                      <th scope="col">Nama</th>
                      <th scope="col">Jurusan</th>
                      <th scope="col">Asal Sekolah</th>
                      <th scope="col">Status</th>
                      <th scope="col">Tanggal</th>
                      <th scope="col">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentStudents.map((student) => (
                      <tr key={student.email}>
                        <td>
                          <span className="admin-student-name">
                            <span aria-hidden="true">{student.full_name.trim().charAt(0).toUpperCase()}</span>
                            {student.full_name}
                          </span>
                        </td>
                        <td>{student.major_name || "Belum dipilih"}</td>
                        <td aria-label="Asal sekolah belum tersedia">—</td>
                        <td>
                          <span className={`admin-account-status status-${student.status || "pending_verification"}`}>
                            {{
                              pending_verification: "Menunggu verifikasi",
                              verified: "Terverifikasi",
                              passed: "Lolos seleksi",
                              not_passed: "Tidak lolos",
                            }[student.status] || "Menunggu verifikasi"}
                          </span>
                        </td>
                        <td>{formatDate.format(new Date(student.created_at))}</td>
                        <td>
                          <Link className="admin-detail-link" href={`/admin/pendaftar/${student.user_id}`}>
                            Lihat Detail
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-empty-state">
                {search ? "Tidak ada akun yang cocok dengan pencarian." : "Belum ada akun calon siswa yang terdaftar."}
              </p>
            )}
          </section>

          <footer className="admin-dashboard-footer">
            <span>Masuk sebagai <strong>{admin.email}</strong></span>
            <span>Sesi berakhir otomatis setelah 8 jam.</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
