import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AdminActionForm from "@/app/admin/AdminActionForm";
import AdminLogoutButton from "@/app/admin/LogoutButton";
import AdminSidebar from "@/app/admin/AdminSidebar";
import SchoolMark from "@/app/components/SchoolMark";
import db from "@/app/lib/db";
import {
  ADMIN_SESSION_COOKIE,
  findAdminSession,
} from "@/app/lib/admin-session";

const sections = {
  pendaftar: { title: "Pendaftar", description: "Cari dan tinjau akun calon siswa yang terdaftar." },
  ujian: { title: "Soal Ujian", description: "Kelola jadwal dan soal ujian resmi SPMB." },
  seleksi: { title: "Seleksi", description: "Tetapkan jurusan dan perbarui status verifikasi serta hasil seleksi." },
  pengumuman: { title: "Pengumuman", description: "Buat informasi resmi dan atur kapan pengumuman ditampilkan." },
  jurusan: { title: "Jurusan", description: "Atur program keahlian dan daya tampung penerimaan." },
  laporan: { title: "Laporan", description: "Tinjau ringkasan penerimaan dan unduh data pendaftar." },
  pengaturan: { title: "Pengaturan", description: "Atur tahun ajaran, jadwal penerimaan, dan kontak sekolah." },
};

export async function generateMetadata({ params }) {
  const { section } = await params;
  const title = sections[section]?.title;
  return {
    title: title ? `${title} | Admin SMK Nan Jaya` : "Menu Admin | SMK Nan Jaya",
    description: sections[section]?.description || "Menu administrasi SPMB SMK Nan Jaya.",
  };
}

const applicationStatuses = [
  { value: "pending_verification", label: "Menunggu verifikasi" },
  { value: "verified", label: "Terverifikasi" },
  { value: "passed", label: "Lolos seleksi" },
  { value: "not_passed", label: "Tidak lolos" },
];

const statusLabels = Object.fromEntries(
  applicationStatuses.map(({ value, label }) => [value, label]),
);
const applicationStatusValues = new Set(applicationStatuses.map(({ value }) => value));

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatPercent(value, total) {
  const percent = total ? (Number(value || 0) / Number(total)) * 100 : 0;
  return `${percent.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

function formatLongDate(value) {
  if (!value) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function ExamQuestionFields(question = {}) {
  return [
    { name: "question_text", label: "Pertanyaan", type: "textarea", value: question.question_text || "", placeholder: "Tulis pertanyaan ujian", required: true, maxLength: 5000, rows: 4 },
    { name: "option_a", label: "Pilihan A", type: "textarea", value: question.option_a || "", required: true, maxLength: 1000 },
    { name: "option_b", label: "Pilihan B", type: "textarea", value: question.option_b || "", required: true, maxLength: 1000 },
    { name: "option_c", label: "Pilihan C", type: "textarea", value: question.option_c || "", required: true, maxLength: 1000 },
    { name: "option_d", label: "Pilihan D", type: "textarea", value: question.option_d || "", required: true, maxLength: 1000 },
    {
      name: "correct_option",
      label: "Kunci jawaban",
      type: "select",
      value: question.correct_option || "A",
      required: true,
      options: ["A", "B", "C", "D"].map((value) => ({ value, label: value })),
    },
    { name: "sort_order", label: "Urutan soal", type: "number", value: question.sort_order || 1, min: 1, max: 65535, required: true },
  ];
}

function SectionStats({ items }) {
  return (
    <div aria-label="Ringkasan data" className="admin-stat-grid admin-section-stat-grid">
      {items.map(({ label, value, note }, index) => (
        <article className="admin-stat-card admin-section-stat-card" key={label}>
          <div className="admin-stat-card-heading">
            <span>{label}</span>
            <span
              aria-hidden="true"
              className={`admin-stat-icon ${["admin-stat-icon-cyan", "admin-stat-icon-green", "admin-stat-icon-orange", "admin-stat-icon-blue"][index % 4]}`}
            >
              {["▦", "✓", "◎", "▣"][index % 4]}
            </span>
          </div>
          <strong>{value}</strong>
          {note && <span className="admin-stat-note">{note}</span>}
        </article>
      ))}
    </div>
  );
}

function ApplicationFilters({ section, search, status }) {
  return (
    <form action={`/admin/${section}`} className="admin-workspace-search admin-filter-panel">
      <label>
        <span>Cari nama, email, atau NISN</span>
        <input
          defaultValue={search}
          maxLength={100}
          name="q"
          placeholder="Masukkan kata kunci"
          type="search"
        />
      </label>
      <label>
        <span>Filter status</span>
        <select defaultValue={status} name="status">
          <option value="">Semua status</option>
          {applicationStatuses.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <button className="admin-action-button" type="submit">Terapkan filter</button>
      {(search || status) && <Link href={`/admin/${section}`}>Hapus filter</Link>}
    </form>
  );
}

function DataTable({ children, headers, allowOverflow = false }) {
  return (
    <div className={`admin-table-scroll${allowOverflow ? " admin-table-scroll-overflow" : ""}`}>
      <table className="admin-students-table admin-workspace-table">
        <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ApplicationTable({ applications, majors, editable }) {
  return (
    <DataTable
      allowOverflow={editable}
      headers={[
        "Nama",
        "NISN",
        "Email",
        "Jurusan",
        "Status",
        ...(editable ? ["Aksi"] : ["Tanggal daftar", "Detail"]),
      ]}
    >
      {applications.map((application) => (
        <tr key={application.user_id}>
          <td>
            <span className="admin-student-name">
              <span aria-hidden="true">{application.full_name.trim().charAt(0).toUpperCase()}</span>
              {application.full_name}
            </span>
          </td>
          <td>{application.nisn || "—"}</td>
          <td>{application.email}</td>
          <td>{application.major_name || "Belum dipilih"}</td>
          <td>
            <span className={`admin-account-status status-${application.status || "pending_verification"}`}>
              {statusLabels[application.status] || statusLabels.pending_verification}
            </span>
          </td>
          {editable ? (
            <td className="admin-inline-edit-cell">
              <div className="admin-row-actions">
                <Link className="admin-detail-link" href={`/admin/pendaftar/${application.user_id}`}>
                  Lihat detail
                </Link>
                <details className="admin-selection-details">
                  <summary>Ubah seleksi</summary>
                  <AdminActionForm
                    action="update"
                    className="admin-selection-form"
                    fields={[
                      {
                        name: "status",
                        label: "Status",
                        type: "select",
                        value: application.status || "pending_verification",
                        options: applicationStatuses,
                      },
                      {
                        name: "majorId",
                        label: "Jurusan",
                        type: "select",
                        value: application.major_id || "",
                        options: [
                          { value: "", label: "Belum dipilih" },
                          ...majors.map((major) => ({ value: String(major.id), label: major.name })),
                        ],
                      },
                    ]}
                    itemId={String(application.user_id)}
                    resource="applications"
                    submitLabel="Simpan perubahan"
                  />
                </details>
              </div>
            </td>
          ) : (
            <>
              <td>{formatDate(application.created_at)}</td>
              <td>
                <Link className="admin-detail-link" href={`/admin/pendaftar/${application.user_id}`}>
                  Lihat detail
                </Link>
              </td>
            </>
          )}
        </tr>
      ))}
    </DataTable>
  );
}

function MajorFields({ major = {} } = {}) {
  return [
    { name: "code", label: "Kode jurusan", value: major.code || "", placeholder: "Contoh: RPL", required: true, maxLength: 20 },
    { name: "name", label: "Nama jurusan", value: major.name || "", placeholder: "Rekayasa Perangkat Lunak", required: true, maxLength: 120 },
    { name: "capacity", label: "Daya tampung", type: "number", value: major.capacity ?? 0, min: 0, max: 65535, required: true },
    { name: "description", label: "Deskripsi", type: "textarea", value: major.description || "", maxLength: 500 },
    { name: "isActive", label: "Jurusan aktif untuk penerimaan", type: "checkbox", value: major.is_active === undefined ? true : Boolean(major.is_active) },
  ];
}

function AnnouncementFields({ announcement = {} } = {}) {
  return [
    { name: "title", label: "Judul pengumuman", value: announcement.title || "", required: true, maxLength: 180 },
    { name: "body", label: "Isi pengumuman", type: "textarea", value: announcement.body || "", required: true, maxLength: 10000, rows: 5 },
    { name: "isPublished", label: "Terbitkan untuk publik", type: "checkbox", value: Boolean(announcement.is_published) },
  ];
}

export default async function AdminSectionPage({ params, searchParams }) {
  const { section } = await params;
  if (!sections[section]) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const admin = await findAdminSession(token);
  if (!admin) redirect("/admin/login");

  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const status = typeof query.status === "string" && applicationStatusValues.has(query.status)
    ? query.status
    : "";
  const pageInfo = sections[section];
  let content;
  let sectionHeading;

  if (section === "pendaftar" || section === "seleksi") {
    const searchValue = search ? `%${search}%` : null;
    const statusValue = status || null;
    const [summaryRows] = await db.execute(
      `SELECT COUNT(DISTINCT users.id) AS total,
              SUM(COALESCE(spmb_applications.status, 'pending_verification') = 'pending_verification') AS pending,
              SUM(spmb_applications.status = 'verified') AS verified,
              SUM(spmb_applications.status = 'passed') AS passed,
              SUM(spmb_applications.status = 'not_passed') AS not_passed
       FROM users
       LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
       WHERE users.role = 'student'`,
    );
    const [applications] = await db.execute(
      `SELECT users.id AS user_id, users.full_name, users.nisn, users.email,
              users.created_at, spmb_applications.status, spmb_applications.major_id,
              spmb_majors.name AS major_name
       FROM users
       LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
       LEFT JOIN spmb_majors ON spmb_majors.id = spmb_applications.major_id
       WHERE users.role = 'student'
         AND (? IS NULL OR users.full_name LIKE ? OR users.email LIKE ? OR users.nisn LIKE ?)
         AND (? IS NULL OR COALESCE(spmb_applications.status, 'pending_verification') = ?)
       ORDER BY users.created_at DESC
       LIMIT 100`,
      [searchValue, searchValue, searchValue, searchValue, statusValue, statusValue],
    );
    const [majors] = await db.execute(
      "SELECT id, name FROM spmb_majors WHERE is_active = TRUE ORDER BY name",
    );
    const totals = summaryRows[0];
    const number = (value) => Number(value || 0).toLocaleString("id-ID");
    const stats = section === "seleksi"
      ? [
        { label: "Menunggu verifikasi", value: number(totals.pending), note: "Perlu ditinjau panitia" },
        { label: "Terverifikasi", value: number(totals.verified), note: "Data pendaftar telah diperiksa" },
        { label: "Lolos seleksi", value: number(totals.passed), note: "Hasil seleksi ditetapkan" },
        { label: "Tidak lolos", value: number(totals.not_passed), note: "Hasil seleksi ditetapkan" },
      ]
      : [
        { label: "Total pendaftar", value: number(totals.total), note: "Seluruh akun calon siswa" },
        { label: "Menunggu verifikasi", value: number(totals.pending), note: "Memerlukan pemeriksaan" },
        { label: "Lolos seleksi", value: number(totals.passed), note: "Hasil seleksi ditetapkan" },
      ];
    content = (
      <>
        <SectionStats items={stats} />
        <ApplicationFilters section={section} search={search} status={status} />
        <section className="admin-panel admin-workspace-panel">
          <header className="admin-panel-heading">
            <div>
              <h2>{section === "seleksi" ? "Tabel Nilai & Status" : "Tabel Pendaftar"}</h2>
              <p>
                {applications.length} data ditampilkan · Maksimal 100 akun terbaru
                {section === "seleksi" ? " · Perbarui status dan jurusan melalui aksi" : ""}
              </p>
            </div>
            <span className="admin-panel-filter">{statusLabels[status] || "Semua status"}</span>
          </header>
          {applications.length ? (
            <ApplicationTable applications={applications} editable={section === "seleksi"} majors={majors} />
          ) : (
            <p className="admin-empty-state">Belum ada akun calon siswa yang cocok.</p>
          )}
        </section>
      </>
    );
  } else if (section === "ujian") {
    const [[settingsRows], [questions], [attempts]] = await Promise.all([
      db.execute(
        `SELECT title, duration_minutes, opens_at, closes_at, is_open,
                DATE_FORMAT(opens_at, '%Y-%m-%dT%H:%i') AS opens_at_local,
                DATE_FORMAT(closes_at, '%Y-%m-%dT%H:%i') AS closes_at_local
         FROM spmb_exam_settings WHERE id = 1 LIMIT 1`,
      ),
      db.execute(
        `SELECT id, question_text, option_a, option_b, option_c, option_d,
                correct_option, sort_order
         FROM spmb_exam_questions ORDER BY sort_order, id`,
      ),
      db.execute(
        `SELECT users.full_name, users.nisn, users.email, spmb_exam_attempts.started_at,
                spmb_exam_attempts.submitted_at, spmb_exam_attempts.score,
                spmb_exam_attempts.correct_answers, spmb_exam_attempts.total_questions
         FROM spmb_exam_attempts
         INNER JOIN users ON users.id = spmb_exam_attempts.user_id
         WHERE users.role = 'student'
         ORDER BY spmb_exam_attempts.started_at DESC
         LIMIT 100`,
      ),
    ]);
    const settings = settingsRows[0] || {
      title: "Ujian SPMB",
      duration_minutes: 60,
      opens_at_local: "",
      closes_at_local: "",
      is_open: false,
    };
    const hasAttempts = attempts.length > 0;
    content = (
      <>
        <SectionStats items={[
          { label: "Jumlah soal", value: questions.length.toLocaleString("id-ID"), note: "Pilihan ganda, empat opsi" },
          { label: "Percobaan dimulai", value: attempts.length.toLocaleString("id-ID"), note: "Satu kali per siswa" },
          { label: "Durasi ujian", value: `${Number(settings.duration_minutes)} menit`, note: "Dihitung sejak siswa memulai" },
          { label: "Status ujian", value: settings.is_open ? "Dibuka" : "Ditutup", note: "Jadwal buka dan tutup berlaku" },
        ]} />
        <section className="admin-panel admin-workspace-panel">
          <header className="admin-panel-heading">
            <div><h2>Jadwal &amp; status ujian</h2><p>Skor langsung ditampilkan setelah siswa mengirim jawaban.</p></div>
          </header>
          <AdminActionForm
            action="configure"
            className="admin-exam-settings-form"
            fields={[
              { name: "title", label: "Nama ujian", value: settings.title, required: true, maxLength: 180 },
              { name: "opens_at", label: "Waktu mulai", type: "datetime-local", value: settings.opens_at_local, required: true },
              { name: "closes_at", label: "Waktu tutup", type: "datetime-local", value: settings.closes_at_local, required: true },
              { name: "is_open", label: "Aktifkan ujian setelah jadwal diatur", type: "checkbox", value: Boolean(settings.is_open) },
            ]}
            resource="exam"
            submitLabel="Simpan jadwal ujian"
          />
        </section>

        <div className="admin-workspace-grid admin-exam-grid">
          <section className="admin-panel admin-form-panel">
            <header className="admin-panel-heading">
              <div><h2>Tambah soal pilihan ganda</h2><p>Empat pilihan dan satu kunci jawaban.</p></div>
            </header>
            {hasAttempts
              ? <p className="admin-empty-state">Soal dikunci karena sudah ada siswa yang memulai ujian.</p>
              : <AdminActionForm fields={ExamQuestionFields()} resource="exam" action="create" submitLabel="Tambah soal" />}
          </section>
          <section className="admin-panel admin-workspace-panel">
            <header className="admin-panel-heading">
              <div><h2>Daftar soal</h2><p>{questions.length} soal · Kunci jawaban hanya terlihat oleh admin.</p></div>
            </header>
            {questions.length ? (
              <div className="admin-exam-question-list">
                {questions.map((question) => (
                  <article className="admin-exam-question-card" key={question.id}>
                    <div className="admin-exam-question-heading">
                      <strong>Soal {question.sort_order}</strong>
                      <span>Kunci: {question.correct_option}</span>
                    </div>
                    <p>{question.question_text}</p>
                    <ol type="A">
                      {[question.option_a, question.option_b, question.option_c, question.option_d].map((option, index) => (
                        <li key={index}>{option}</li>
                      ))}
                    </ol>
                    <div className="admin-row-actions">
                      {hasAttempts ? (
                        <span className="admin-cell-description">Dikunci setelah ujian dimulai</span>
                      ) : (
                        <>
                          <details className="admin-edit-details">
                            <summary>Edit soal</summary>
                            <AdminActionForm
                              action="update"
                              fields={ExamQuestionFields(question)}
                              itemId={String(question.id)}
                              resource="exam"
                              submitLabel="Simpan perubahan"
                            />
                          </details>
                          <AdminActionForm
                            action="delete"
                            className="admin-delete-form"
                            confirmMessage={`Hapus soal nomor ${question.sort_order}?`}
                            fields={[]}
                            itemId={String(question.id)}
                            resource="exam"
                            submitLabel="Hapus"
                          />
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="admin-empty-state">Tambahkan soal sebelum membuka ujian.</p>}
          </section>
        </div>

        <section className="admin-panel admin-workspace-panel">
          <header className="admin-panel-heading">
            <div><h2>Hasil ujian siswa</h2><p>Skor dicatat otomatis ketika ujian dikirim atau waktunya habis.</p></div>
          </header>
          {attempts.length ? (
            <DataTable headers={["Nama siswa", "NISN", "Email", "Mulai", "Status", "Nilai"]}>
              {attempts.map((attempt) => (
                <tr key={attempt.email}>
                  <td>{attempt.full_name}</td>
                  <td>{attempt.nisn || "—"}</td>
                  <td>{attempt.email}</td>
                  <td>{formatDate(attempt.started_at)}</td>
                  <td>{attempt.submitted_at ? `Dikirim · ${Number(attempt.correct_answers)}/${Number(attempt.total_questions)} benar` : "Sedang berlangsung"}</td>
                  <td>{attempt.score == null ? "—" : Number(attempt.score).toLocaleString("id-ID", { maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </DataTable>
          ) : <p className="admin-empty-state">Belum ada siswa yang memulai ujian.</p>}
        </section>
      </>
    );
  } else if (section === "jurusan") {
    const [majors] = await db.execute(
      `SELECT spmb_majors.id, spmb_majors.code, spmb_majors.name,
              spmb_majors.description, spmb_majors.capacity, spmb_majors.is_active,
              COUNT(spmb_applications.id) AS applicant_count
       FROM spmb_majors
       LEFT JOIN spmb_applications ON spmb_applications.major_id = spmb_majors.id
       GROUP BY spmb_majors.id
       ORDER BY spmb_majors.name`,
    );
    const activeMajors = majors.filter((major) => Boolean(major.is_active));
    const totalCapacity = activeMajors.reduce((total, major) => total + Number(major.capacity || 0), 0);
    const assignedApplicants = majors.reduce((total, major) => total + Number(major.applicant_count || 0), 0);
    content = (
      <>
        <SectionStats
          items={[
            { label: "Daya tampung aktif", value: Number(totalCapacity).toLocaleString("id-ID"), note: "Kuota dari jurusan aktif" },
            { label: "Pendaftar ditempatkan", value: Number(assignedApplicants).toLocaleString("id-ID"), note: "Pendaftar dengan pilihan jurusan" },
            { label: "Jurusan aktif", value: Number(activeMajors.length).toLocaleString("id-ID"), note: `${majors.length} program keahlian terdaftar` },
          ]}
        />
        <div className="admin-major-layout">
          <section className="admin-panel admin-workspace-panel admin-major-program-panel">
            <header className="admin-panel-heading">
              <div><h2>Kartu Jurusan</h2><p>Program keahlian dan status penerimaan.</p></div>
              <span className="admin-panel-filter">{majors.length} program</span>
            </header>
            {majors.length ? (
              <div className="admin-major-card-grid">
                {majors.map((major) => (
                  <article className="admin-major-card" key={major.id}>
                    <div className="admin-major-card-meta">
                      <span>{major.code}</span>
                      <span className={`admin-account-status ${major.is_active ? "status-passed" : "status-not_passed"}`}>
                        {major.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <h3>{major.name}</h3>
                    <p>{major.description || "Deskripsi belum tersedia."}</p>
                    <div className="admin-major-card-foot">
                      <span>{Number(major.applicant_count || 0).toLocaleString("id-ID")} pendaftar</span>
                      <strong>{Number(major.capacity || 0).toLocaleString("id-ID")} kuota</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="admin-empty-state">Belum ada jurusan. Tambahkan program keahlian untuk mulai menerima pendaftar.</p>}
          </section>

          <section className="admin-panel admin-workspace-panel admin-major-quota-panel">
            <header className="admin-panel-heading">
              <div><h2>Kuota &amp; Kelola</h2><p>Pemakaian daya tampung setiap jurusan.</p></div>
            </header>
            {majors.length ? (
              <div className="admin-major-quota-list">
                {majors.map((major) => {
                  const capacity = Number(major.capacity || 0);
                  const applicants = Number(major.applicant_count || 0);
                  const usedPercent = capacity ? Math.min(100, (applicants / capacity) * 100) : 0;
                  return (
                    <article className="admin-quota-row" key={major.id}>
                      <div className="admin-quota-heading">
                        <strong>{major.name}</strong>
                        <span>{applicants.toLocaleString("id-ID")} / {capacity.toLocaleString("id-ID")}</span>
                      </div>
                      <div
                        aria-label={`Pemakaian kuota ${major.name}`}
                        aria-valuemax={capacity || 1}
                        aria-valuemin={0}
                        aria-valuenow={Math.min(applicants, capacity)}
                        className="admin-quota-track"
                        role="progressbar"
                        style={{ "--admin-quota-fill": `${usedPercent}%` }}
                      >
                        <span />
                      </div>
                      <div className="admin-row-actions">
                        <details className="admin-edit-details">
                          <summary>Edit</summary>
                          <AdminActionForm
                            action="update"
                            fields={MajorFields(major)}
                            itemId={String(major.id)}
                            resource="majors"
                            submitLabel="Simpan perubahan"
                          />
                        </details>
                        <AdminActionForm
                          action="delete"
                          className="admin-delete-form"
                          confirmMessage={`Hapus jurusan ${major.name}? Pendaftar terkait akan menjadi belum memilih jurusan.`}
                          fields={[]}
                          itemId={String(major.id)}
                          resource="majors"
                          submitLabel="Hapus"
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : <p className="admin-empty-state">Data kuota akan tampil setelah jurusan ditambahkan.</p>}
          </section>
        </div>
        <details className="admin-panel admin-create-major-panel">
          <summary className="admin-panel-heading">
            <div><h2>Tambah jurusan</h2><p>Daftarkan program keahlian baru.</p></div>
            <span aria-hidden="true" className="admin-create-major-icon">+</span>
          </summary>
          <AdminActionForm fields={MajorFields()} resource="majors" action="create" submitLabel="Tambah jurusan" />
        </details>
      </>
    );
  } else if (section === "pengumuman") {
    const [announcements] = await db.execute(
      "SELECT id, title, body, is_published, published_at, updated_at FROM spmb_announcements ORDER BY updated_at DESC",
    );
    const publishedCount = announcements.filter((announcement) => Boolean(announcement.is_published)).length;
    content = (
      <>
        <SectionStats
          items={[
            { label: "Total pengumuman", value: announcements.length.toLocaleString("id-ID"), note: "Informasi tersimpan" },
            { label: "Terbit", value: publishedCount.toLocaleString("id-ID"), note: "Tampil pada portal SPMB" },
            { label: "Draf", value: (announcements.length - publishedCount).toLocaleString("id-ID"), note: "Belum ditampilkan ke publik" },
          ]}
        />
        <div className="admin-workspace-grid">
          <section className="admin-panel admin-form-panel">
            <header className="admin-panel-heading"><div><h2>Buat pengumuman</h2><p>Pengumuman terbit akan tampil di portal SPMB.</p></div></header>
            <AdminActionForm fields={AnnouncementFields()} resource="announcements" action="create" submitLabel="Simpan pengumuman" />
          </section>
          <section className="admin-panel admin-workspace-panel">
            <header className="admin-panel-heading"><div><h2>Daftar pengumuman</h2><p>{announcements.length} pengumuman.</p></div></header>
            {announcements.length ? (
              <div className="admin-announcement-list">
                {announcements.map((announcement) => (
                  <article className="admin-announcement-card" key={announcement.id}>
                    <header>
                      <div>
                        <span className={`admin-account-status ${announcement.is_published ? "status-passed" : "status-pending_verification"}`}>
                          {announcement.is_published ? "Terbit" : "Draf"}
                        </span>
                        <h3>{announcement.title}</h3>
                        <p>{formatDate(announcement.published_at || announcement.updated_at)}</p>
                      </div>
                      <div className="admin-row-actions">
                        <details className="admin-edit-details">
                          <summary>Edit</summary>
                          <AdminActionForm
                            action="update"
                            fields={AnnouncementFields(announcement)}
                            itemId={String(announcement.id)}
                            resource="announcements"
                            submitLabel="Simpan perubahan"
                          />
                        </details>
                        <AdminActionForm
                          action="delete"
                          className="admin-delete-form"
                          confirmMessage={`Hapus pengumuman “${announcement.title}”?`}
                          fields={[]}
                          itemId={String(announcement.id)}
                          resource="announcements"
                          submitLabel="Hapus"
                        />
                      </div>
                    </header>
                    <p className="admin-announcement-body">{announcement.body}</p>
                  </article>
                ))}
              </div>
            ) : <p className="admin-empty-state">Belum ada pengumuman.</p>}
          </section>
        </div>
      </>
    );
  } else if (section === "laporan") {
    const [summaryRows] = await db.execute(
      `SELECT COUNT(*) AS total,
              SUM(COALESCE(spmb_applications.status, 'pending_verification') = 'pending_verification') AS pending,
              SUM(spmb_applications.status = 'verified') AS verified,
              SUM(spmb_applications.status = 'passed') AS passed,
              SUM(spmb_applications.status = 'not_passed') AS not_passed
       FROM users
       LEFT JOIN spmb_applications ON spmb_applications.user_id = users.id
       WHERE users.role = 'student'`,
    );
    const [majorRows] = await db.execute(
      `SELECT spmb_majors.code, spmb_majors.name, spmb_majors.capacity, spmb_majors.is_active,
              COUNT(spmb_applications.id) AS applicants
       FROM spmb_majors
       LEFT JOIN spmb_applications ON spmb_applications.major_id = spmb_majors.id
       GROUP BY spmb_majors.id
       ORDER BY spmb_majors.name`,
    );
    const report = summaryRows[0];
    const totalApplicants = Number(report.total || 0);
    const verifiedApplicants = Number(report.verified || 0)
      + Number(report.passed || 0)
      + Number(report.not_passed || 0);
    const activeMajorRows = majorRows.filter((major) => Boolean(major.is_active));
    const totalCapacity = activeMajorRows.reduce((total, major) => total + Number(major.capacity || 0), 0);
    const assignedApplicants = activeMajorRows.reduce((total, major) => total + Number(major.applicants || 0), 0);
    const reportStatuses = [
      { label: "Menunggu verifikasi", value: Number(report.pending || 0), color: "#e4a12d" },
      { label: "Terverifikasi", value: Number(report.verified || 0), color: "#397ae0" },
      { label: "Lolos seleksi", value: Number(report.passed || 0), color: "#3b9a62" },
      { label: "Tidak lolos", value: Number(report.not_passed || 0), color: "#d26e68" },
    ];
    content = (
      <>
        <SectionStats
          items={[
            { label: "Total pendaftar", value: totalApplicants.toLocaleString("id-ID"), note: "Seluruh akun calon siswa" },
            { label: "Verifikasi selesai", value: formatPercent(verifiedApplicants, totalApplicants), note: `${verifiedApplicants.toLocaleString("id-ID")} pendaftar` },
            { label: "Lolos seleksi", value: formatPercent(report.passed, totalApplicants), note: `${Number(report.passed || 0).toLocaleString("id-ID")} pendaftar` },
            { label: "Kuota terpakai", value: formatPercent(assignedApplicants, totalCapacity), note: `${assignedApplicants.toLocaleString("id-ID")} dari ${totalCapacity.toLocaleString("id-ID")} kuota` },
          ]}
        />
        <section aria-labelledby="admin-report-status-title" className="admin-panel admin-report-status">
          <header className="admin-panel-heading">
            <div><h2 id="admin-report-status-title">Distribusi proses seleksi</h2><p>Ringkasan status seluruh pendaftar.</p></div>
            <span className="admin-panel-filter">{totalApplicants.toLocaleString("id-ID")} pendaftar</span>
          </header>
          <div aria-label="Komposisi status pendaftar" className="admin-report-status-bar" role="img">
            {reportStatuses.map(({ label, value, color }) => (
              <span
                key={label}
                style={{ backgroundColor: color, width: `${totalApplicants ? (value / totalApplicants) * 100 : 0}%` }}
                title={`${label}: ${value.toLocaleString("id-ID")}`}
              />
            ))}
          </div>
          <ul className="admin-report-status-legend">
            {reportStatuses.map(({ label, value, color }) => (
              <li key={label}>
                <span aria-hidden="true" style={{ backgroundColor: color }} />
                <span>{label}</span>
                <strong>{value.toLocaleString("id-ID")}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="admin-panel admin-workspace-panel">
          <header className="admin-panel-heading">
            <div><h2>Ringkasan per jurusan</h2><p>Jumlah pendaftar dibandingkan daya tampung.</p></div>
            <Link className="admin-action-button admin-download-button" href="/api/admin/reports">Unduh CSV</Link>
          </header>
          {majorRows.length ? (
            <DataTable headers={["Kode", "Jurusan", "Daya tampung", "Pendaftar", "Pemakaian kuota", "Sisa kapasitas"]}>
              {majorRows.map((major) => (
                <tr key={major.code}>
                  <td>{major.code}</td>
                  <td>{major.name}</td>
                  <td>{Number(major.capacity).toLocaleString("id-ID")}</td>
                  <td>{Number(major.applicants).toLocaleString("id-ID")}</td>
                  <td className="admin-report-progress-cell">
                    <progress
                      aria-label={`Pemakaian kuota jurusan ${major.name}`}
                      max={Number(major.capacity) || 1}
                      value={Math.min(Number(major.applicants), Number(major.capacity))}
                    />
                    <span>{formatPercent(major.applicants, major.capacity)}</span>
                  </td>
                  <td>{Math.max(0, Number(major.capacity) - Number(major.applicants)).toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </DataTable>
          ) : <p className="admin-empty-state">Tambahkan jurusan untuk melihat laporan kapasitas.</p>}
        </section>
      </>
    );
  } else {
    const [settingRows] = await db.execute(
      "SELECT setting_key, setting_value FROM spmb_settings WHERE setting_key IN (?, ?, ?, ?, ?)",
      ["academic_year", "registration_open_date", "registration_close_date", "school_contact_email", "school_contact_phone"],
    );
    const settings = Object.fromEntries(settingRows.map((setting) => [setting.setting_key, setting.setting_value]));
    const currentDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const openDate = settings.registration_open_date || "";
    const closeDate = settings.registration_close_date || "";
    const periodStatus = openDate && closeDate
      ? currentDate < openDate
        ? "Akan dibuka"
        : currentDate > closeDate
          ? "Periode selesai"
          : "Sedang berlangsung"
      : "Jadwal belum lengkap";
    const periodRange = openDate || closeDate
      ? `${formatLongDate(openDate)} – ${formatLongDate(closeDate)}`
      : "Tanggal belum ditentukan";
    const contactItems = [
      { label: "Email kontak", value: settings.school_contact_email || "Belum diatur", configured: Boolean(settings.school_contact_email) },
      { label: "Telepon / WhatsApp", value: settings.school_contact_phone || "Belum diatur", configured: Boolean(settings.school_contact_phone) },
    ];
    sectionHeading = (
      <div className="admin-period-heading">
        <div>
          <span className="admin-period-eyebrow">Pengaturan penerimaan</span>
          <div className="admin-period-title-row">
            <h1 id="admin-section-title">Periode SPMB {settings.academic_year || "2026/2027"}</h1>
            <span className={`admin-period-state${periodStatus === "Sedang berlangsung" ? " is-active" : ""}`}>
              <span aria-hidden="true" />{periodStatus}
            </span>
          </div>
          <p>Kelola jadwal, informasi kontak, dan pengaturan penerimaan calon siswa.</p>
        </div>
        <button className="admin-action-button admin-period-save" form="admin-settings-form" type="submit">
          Simpan perubahan
        </button>
      </div>
    );
    content = (
      <>
        <div aria-label="Ringkasan periode penerimaan" className="admin-period-overview">
          <article className="admin-period-overview-card">
            <span aria-hidden="true" className="admin-period-overview-icon">◷</span>
            <div><span>Jadwal pendaftaran</span><strong>{periodRange}</strong></div>
          </article>
          <article className="admin-period-overview-card">
            <span aria-hidden="true" className="admin-period-overview-icon">▣</span>
            <div><span>Tahun akademik</span><strong>{settings.academic_year || "2026/2027"}</strong></div>
          </article>
          <article className="admin-period-overview-card">
            <span aria-hidden="true" className="admin-period-overview-icon">◎</span>
            <div><span>Status periode</span><strong>{periodStatus}</strong></div>
          </article>
        </div>

        <div className="admin-settings-layout">
          <nav aria-label="Bagian pengaturan periode" className="admin-settings-nav">
            <span className="admin-settings-nav-title">Periode &amp; jadwal</span>
            <a className="is-active" href="#admin-period-info">Informasi Periode</a>
            <a href="#admin-period-schedule">Jadwal pendaftaran</a>
            <a href="#admin-period-contacts">Otomasi &amp; Notifikasi</a>
            <a href="#admin-period-security">Akun Admin &amp; Keamanan</a>
            <div className="admin-settings-period-summary">
              <span>Periode aktif</span>
              <strong>SPMB {settings.academic_year || "2026/2027"}</strong>
              <small>{periodStatus}</small>
            </div>
          </nav>

          <div className="admin-settings-main">
            <section aria-labelledby="admin-period-info-title" className="admin-panel admin-period-info-panel" id="admin-period-info">
              <header className="admin-panel-heading">
                <div>
                  <h2 id="admin-period-info-title">Informasi Periode</h2>
                  <p>Identitas dan rentang waktu pendaftaran.</p>
                </div>
                <span className="admin-period-panel-tag">Periode aktif</span>
              </header>
              <AdminActionForm
                action="update"
                className="admin-settings-form admin-period-form"
                fields={[
                  { name: "academic_year", label: "Tahun ajaran", value: settings.academic_year || "2026/2027", placeholder: "2026/2027", required: true, maxLength: 9 },
                  { name: "registration_open_date", label: "Tanggal pembukaan pendaftaran", type: "date", value: openDate },
                  { name: "registration_close_date", label: "Tanggal penutupan pendaftaran", type: "date", value: closeDate },
                  { name: "school_contact_email", label: "Email kontak sekolah", type: "email", value: settings.school_contact_email || "", maxLength: 254 },
                  { name: "school_contact_phone", label: "Telepon/WhatsApp sekolah", type: "tel", value: settings.school_contact_phone || "", maxLength: 20 },
                ]}
                id="admin-settings-form"
                resource="settings"
                submitLabel="Simpan pengaturan"
              />
              <div className="admin-period-save-note">
                <span aria-hidden="true">i</span>
                Perubahan periode akan digunakan pada informasi pendaftaran yang ditampilkan kepada calon siswa.
              </div>
            </section>

            <section aria-labelledby="admin-period-schedule-title" className="admin-panel admin-period-schedule-panel" id="admin-period-schedule">
              <header className="admin-panel-heading">
                <div>
                  <h2 id="admin-period-schedule-title">Jadwal Pendaftaran</h2>
                  <p>Tanggal penting untuk periode penerimaan ini.</p>
                </div>
                <a className="admin-detail-link" href="#admin-period-info">Ubah jadwal</a>
              </header>
              <div className="admin-period-timeline">
                {[
                  { title: "Pendaftaran dibuka", date: openDate, detail: "Calon siswa dapat mengirim pendaftaran." },
                  { title: "Pendaftaran ditutup", date: closeDate, detail: "Pendaftaran baru tidak lagi diterima setelah tanggal ini." },
                ].map(({ title, date, detail }) => (
                  <article className="admin-period-timeline-item" key={title}>
                    <span aria-hidden="true" className={`admin-period-timeline-marker${date ? " is-set" : ""}`} />
                    <div>
                      <strong>{title}</strong>
                      <p>{detail}</p>
                    </div>
                    <time>{formatLongDate(date)}</time>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="admin-settings-aside">
            <section aria-labelledby="admin-period-contacts-title" className="admin-panel admin-settings-aside-panel" id="admin-period-contacts">
              <header className="admin-panel-heading">
                <div><h2 id="admin-period-contacts-title">Otomasi &amp; Notifikasi</h2><p>Kontak informasi pendaftaran.</p></div>
              </header>
              <div className="admin-settings-contact-list">
                {contactItems.map(({ label, value, configured }) => (
                  <div className="admin-settings-contact" key={label}>
                    <span className={`admin-settings-contact-state${configured ? " is-configured" : ""}`} aria-hidden="true">
                      {configured ? "✓" : "–"}
                    </span>
                    <div><strong>{label}</strong><span>{value}</span></div>
                  </div>
                ))}
              </div>
              <a className="admin-settings-aside-link" href="#admin-period-info">Kelola kontak <span aria-hidden="true">→</span></a>
            </section>

            <section aria-labelledby="admin-period-security-title" className="admin-panel admin-settings-aside-panel" id="admin-period-security">
              <header className="admin-panel-heading">
                <div><h2 id="admin-period-security-title">Akun Admin &amp; Keamanan</h2><p>Akses dan sesi administrator.</p></div>
              </header>
              <div className="admin-settings-security">
                <span aria-hidden="true" className="admin-settings-security-icon">♙</span>
                <div><strong>{admin.full_name}</strong><span>{admin.email}</span></div>
              </div>
              <div className="admin-settings-security-note">
                Sesi admin berakhir otomatis setelah 8 jam untuk menjaga keamanan akun.
              </div>
            </section>

            <section aria-labelledby="admin-period-danger-title" className="admin-panel admin-settings-danger">
              <header className="admin-panel-heading">
                <div><h2 id="admin-period-danger-title">Zona Berbahaya</h2><p>Penutupan periode pendaftaran.</p></div>
              </header>
              <p>Periode akan berhenti menerima pendaftar setelah tanggal penutupan yang ditetapkan.</p>
              <a className="admin-settings-danger-link" href="#admin-period-info">Periksa tanggal penutupan</a>
            </section>
          </aside>
        </div>
      </>
    );
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-topbar">
        <Link aria-label="Dashboard admin SMK Nan Jaya" className="admin-brand" href="/admin">
          <SchoolMark /><span>SPMB ADMIN<small>SMK NAN JAYA</small></span>
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
        <AdminSidebar admin={admin} currentSection={section} />
        <section aria-labelledby="admin-section-title" className="admin-dashboard-content admin-workspace-content">
          {sectionHeading || (
            <div className="admin-dashboard-heading">
              <div>
                <h1 id="admin-section-title">{pageInfo.title}</h1>
                <p>{pageInfo.description}</p>
              </div>
              <span className="admin-updated-badge"><span aria-hidden="true" />Data tersimpan</span>
            </div>
          )}
          {content}
          <footer className="admin-dashboard-footer">
            <span>Masuk sebagai <strong>{admin.email}</strong></span>
            <span>Sesi berakhir otomatis setelah 8 jam.</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
