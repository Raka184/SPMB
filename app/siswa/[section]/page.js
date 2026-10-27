import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import StudentPortalFrame from "@/app/siswa/PortalFrame";
import StudentExam from "@/app/siswa/StudentExam";
import { applicationStatusLabels, formatStudentDate } from "@/app/siswa/navigation";
import db from "@/app/lib/db";
import { findStudentSession, STUDENT_SESSION_COOKIE } from "@/app/lib/student-session";

const sections = {
  ujian: {
    title: "Ujian SPMB",
    description: "Kerjakan ujian resmi sesuai jadwal dari panitia SPMB.",
  },
  pendaftaran: {
    title: "Pendaftaran",
    description: "Lihat data program pilihan dan perkembangan seleksimu.",
  },
  pengumuman: {
    title: "Pengumuman",
    description: "Baca informasi resmi penerimaan siswa baru.",
  },
  profil: {
    title: "Profil",
    description: "Tinjau informasi akun calon murid.",
  },
};

export async function generateMetadata({ params }) {
  const { section } = await params;
  return { title: `${sections[section]?.title || "Portal Siswa"} | SPMB SMK Nan Jaya` };
}

export default async function StudentSectionPage({ params, searchParams }) {
  const { section } = await params;
  if (!sections[section]) notFound();

  const cookieStore = await cookies();
  const student = await findStudentSession(cookieStore.get(STUDENT_SESSION_COOKIE)?.value);
  if (!student) redirect("/");

  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  let content;
  if (section === "ujian") {
    const [[examRows], [attemptRows]] = await Promise.all([
      db.execute(
        `SELECT title, duration_minutes, is_open,
                opens_at <= CURRENT_TIMESTAMP AS has_opened,
                closes_at >= CURRENT_TIMESTAMP AS has_not_closed,
                (SELECT COUNT(*) FROM spmb_exam_questions) AS questions_count
         FROM spmb_exam_settings WHERE id = 1 LIMIT 1`,
      ),
      db.execute(
        `SELECT submitted_at, score, correct_answers, total_questions,
                expires_at <= CURRENT_TIMESTAMP AS is_expired
         FROM spmb_exam_attempts WHERE user_id = ? LIMIT 1`,
        [student.id],
      ),
    ]);
    const exam = examRows[0];
    const attempt = attemptRows[0] || null;
    content = exam ? (
      <StudentExam
        attempt={attempt?.submitted_at ? attempt : null}
        exam={{
          title: exam.title,
          durationMinutes: Number(exam.duration_minutes),
          isOpen: Boolean(exam.is_open),
          available: Boolean(exam.is_open && exam.has_opened && exam.has_not_closed),
          questionsCount: Number(exam.questions_count),
          hasAttempt: Boolean(attempt && !attempt.submitted_at),
        }}
      />
    ) : (
      <section className="admin-panel"><p className="admin-empty-state">Pengaturan ujian belum tersedia. Hubungi panitia SPMB.</p></section>
    );
  } else if (section === "pendaftaran") {
    const [applications] = await db.execute(
      `SELECT spmb_applications.status, spmb_applications.created_at,
              spmb_applications.updated_at, spmb_majors.name AS major_name,
              spmb_majors.code AS major_code
       FROM spmb_applications
       LEFT JOIN spmb_majors ON spmb_majors.id = spmb_applications.major_id
       WHERE spmb_applications.user_id = ?
       LIMIT 1`,
      [student.id],
    );
    const application = applications[0] || null;
    const status = applicationStatusLabels[application?.status] || applicationStatusLabels.pending_verification;
    content = (
      <section className="admin-panel student-detail-panel">
        <header className="admin-panel-heading"><div><h2>Informasi pendaftaran</h2><p>Data yang tersimpan pada akun SPMB-mu.</p></div></header>
        <dl className="student-application-details">
          <div><dt>Nama calon murid</dt><dd>{student.full_name}</dd></div>
          <div><dt>NISN</dt><dd>{student.nisn || "Belum tersedia"}</dd></div>
          <div><dt>Email akun</dt><dd>{student.email}</dd></div>
          <div><dt>Program keahlian</dt><dd>{application?.major_name || "Belum dipilih"}</dd></div>
          <div><dt>Status seleksi</dt><dd><span className={`admin-account-status status-${application?.status || "pending_verification"}`}>{status}</span></dd></div>
          <div><dt>Tanggal pendaftaran</dt><dd>{formatStudentDate(application?.created_at)}</dd></div>
          <div><dt>Pembaruan terakhir</dt><dd>{formatStudentDate(application?.updated_at)}</dd></div>
        </dl>
        {!application?.major_code && (
          <p className="student-information-note">Jika program pilihan belum tercantum, hubungi panitia SPMB untuk mendapatkan bantuan.</p>
        )}
      </section>
    );
  } else if (section === "pengumuman") {
    const searchValue = search ? `%${search}%` : null;
    const [announcements] = await db.execute(
      `SELECT id, title, body, published_at
       FROM spmb_announcements
       WHERE is_published = TRUE
         AND (? IS NULL OR title LIKE ? OR body LIKE ?)
       ORDER BY published_at DESC, id DESC`,
      [searchValue, searchValue, searchValue],
    );
    content = announcements.length ? (
      <div className="student-announcements-page">
        {announcements.map((announcement) => (
          <article className="admin-panel student-announcement-card" key={announcement.id}>
            <span>{formatStudentDate(announcement.published_at)}</span>
            <h2>{announcement.title}</h2>
            <p>{announcement.body}</p>
          </article>
        ))}
      </div>
    ) : <section className="admin-panel"><p className="admin-empty-state">{search ? "Tidak ada pengumuman yang cocok." : "Belum ada pengumuman yang diterbitkan."}</p></section>;
  } else {
    content = (
      <section className="admin-panel student-detail-panel">
        <header className="admin-panel-heading"><div><h2>Informasi akun</h2><p>Detail profil yang terhubung dengan akun SPMB kamu.</p></div></header>
        <dl className="student-application-details">
          <div><dt>Nama lengkap</dt><dd>{student.full_name}</dd></div>
          <div><dt>Email</dt><dd>{student.email}</dd></div>
          <div><dt>NISN</dt><dd>{student.nisn || "Belum tersedia"}</dd></div>
          <div><dt>Nomor WhatsApp</dt><dd>{student.phone || "Belum tersedia"}</dd></div>
          <div><dt>Jenis akun</dt><dd>Calon murid SPMB</dd></div>
        </dl>
      </section>
    );
  }

  return (
    <StudentPortalFrame currentSection={section} searchTerm={search} student={student}>
      <section aria-labelledby="student-section-title" className="admin-workspace-content student-dashboard-content">
        <div className="admin-dashboard-heading">
          <div><h1 id="student-section-title">{sections[section].title}</h1><p>{sections[section].description}</p></div>
          <Link className="student-back-link" href="/siswa">← Dashboard</Link>
        </div>
        {content}
      </section>
    </StudentPortalFrame>
  );
}
