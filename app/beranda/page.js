import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import db from "@/app/lib/db";
import {
  findStudentSession,
  STUDENT_SESSION_COOKIE,
} from "@/app/lib/student-session";
import SchoolMark from "@/app/components/SchoolMark";

export const metadata = {
  title: "SPMB SMK Nan Jaya | Penerimaan Murid Baru",
  description:
    "Daftar SMK Nan Jaya secara daring, pantau proses seleksi, dan temukan informasi program keahlian, daya tampung, serta persyaratan pendaftaran.",
};

function CheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="m4.5 10.3 3.4 3.4 7.7-7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M3.5 10h13m-5.5-5.5L16.5 10 11 15.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7.1" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="7.4" r="2.1" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.8 14.7c.7-1.7 2.2-2.6 4.2-2.6s3.5.9 4.2 2.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function NewsDocumentIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M13.5 3.5H6.75A2.25 2.25 0 0 0 4.5 5.75v12.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="M13 3.75v4.5h4.5M8 13h3m-3 3h2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="m15 10.5 4.25 4.25m-5.5 1.25 1-3.5 5.5-5.5a1.77 1.77 0 0 1 2.5 2.5l-5.5 5.5-3.5 1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function NewsLocationIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M19.5 10.25c0 5.25-7.5 11-7.5 11s-7.5-5.75-7.5-11a7.5 7.5 0 1 1 15 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="9.75" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M17.5 18.5h2a2 2 0 0 1 2 2v.75h-6v-.75a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

const faqs = [
  {
    question: "Apakah pendaftaran SMK Nan Jaya dipungut biaya?",
    answer:
      "Tidak. Seluruh proses pendaftaran SMK Nan Jaya melalui portal resmi tidak dipungut biaya. Waspadai pihak yang meminta pembayaran.",
  },
  {
    question: "Bagaimana jika NIK calon murid tidak ditemukan saat mendaftar?",
    answer:
      "Periksa kembali nomor NIK pada Kartu Keluarga. Jika masih belum ditemukan, hubungi pusat bantuan agar petugas dapat membantu pengecekan.",
  },
  {
    question:
      "Apakah pilihan program keahlian dapat diubah setelah pendaftaran?",
    answer:
      "Pilihan program dapat ditinjau kembali sebelum formulir dikirim. Jika formulir sudah dikirim, hubungi panitia SPMB untuk mendapatkan arahan.",
  },
  {
    question: "Bagaimana proses verifikasi dokumen pendaftaran?",
    answer:
      "Panitia akan memeriksa kelengkapan dan keterbacaan dokumen. Pantau status verifikasi secara berkala melalui akun pendaftaran.",
  },
  {
    question: "Apa yang harus dilakukan setelah dinyatakan lolos seleksi?",
    answer:
      "Ikuti petunjuk daftar ulang dan lengkapi berkas yang diminta sesuai informasi resmi dari SMK Nan Jaya.",
  },
  {
    question: "Bisakah mendaftar tanpa perangkat pribadi?",
    answer:
      "Bisa. Calon murid dapat meminta bantuan orang tua atau datang ke posko bantuan sekolah untuk mengakses proses pendaftaran.",
  },
];

const featuredPrograms = [
  {
    code: "TKJ",
    title: "Teknik Komputer Dan Jaringan",
    image: "/images/siswa-tkj-nan-jaya.png",
    alt: "Murid program Teknik Komputer dan Jaringan SMK Nan Jaya",
    icon: "⌘",
  },
  {
    code: "RPL",
    title: "Rekayasa Perangkat Lunak",
    image: "/images/siswa-rpl-nan-jaya.png",
    alt: "Murid program Rekayasa Perangkat Lunak SMK Nan Jaya",
    icon: "▣",
  },
  {
    code: "MPLB",
    title: "Bisnis Manajemen",
    image: "/images/siswa-bisnis-nan-jaya.png",
    alt: "Murid program Bisnis Manajemen SMK Nan Jaya",
    icon: "♙",
  },
];

export default async function HomePage() {
  const cookieStore = await cookies();
  const student = await findStudentSession(cookieStore.get(STUDENT_SESSION_COOKIE)?.value);
  const [majorRows] = await db.execute(
    `SELECT code, name, description, capacity
     FROM spmb_majors
     WHERE is_active = TRUE
     ORDER BY name`,
  );
  const [announcements] = await db.execute(
    `SELECT id, title, body, published_at
     FROM spmb_announcements
     WHERE is_published = TRUE
     ORDER BY published_at DESC, created_at DESC
     LIMIT 3`,
  );
  const [[applicationStats]] = await db.execute(
    `SELECT
       COUNT(*) AS total_applicants,
       SUM(status = 'verified') AS verified_applicants
     FROM spmb_applications`,
  );
  const [settingRows] = await db.execute(
    `SELECT setting_key, setting_value
     FROM spmb_settings
     WHERE setting_key IN (
       'academic_year',
       'school_contact_email',
       'school_contact_phone'
     )`,
  );
  const settings = Object.fromEntries(
    settingRows.map(({ setting_key, setting_value }) => [setting_key, setting_value]),
  );
  const academicYear = settings.academic_year || "2026/2027";
  const totalCapacity = majorRows.reduce((total, major) => total + Number(major.capacity), 0);
  const majorsByCode = new Map(majorRows.map((major) => [major.code.toUpperCase(), major]));
  const pathwayCards = featuredPrograms
    .map((program) => {
      const major = majorsByCode.get(program.code);
      return major ? {
        ...program,
        capacity: Number(major.capacity).toLocaleString("id-ID"),
      } : null;
    })
    .filter(Boolean);
  const stats = [
    { value: Number(applicationStats.total_applicants).toLocaleString("id-ID"), label: "Calon murid terdaftar" },
    { value: majorRows.length.toLocaleString("id-ID"), label: "Program keahlian aktif" },
    { value: totalCapacity.toLocaleString("id-ID"), label: "Total daya tampung" },
    { value: Number(applicationStats.verified_applicants || 0).toLocaleString("id-ID"), label: "Pendaftar terverifikasi" },
  ];
  const formatAnnouncementDate = (value) => new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
  const contactPhone = settings.school_contact_phone || "";
  const contactPhoneLink = contactPhone.replace(/[^\d+]/g, "");
  const latestAnnouncement = announcements[0];

  return (
    <main className="spmb-homepage">
      <div className="spmb-announcement-bar">
        <div className="spmb-container spmb-announcement-inner">
          <span className="spmb-official-note">
            <i aria-hidden="true" />
            Portal resmi layanan pendidikan · Tahun Ajaran {academicYear}
          </span>
          <div className="spmb-announcement-contact">
            <span>{settings.school_contact_email || "Layanan informasi sekolah"}</span>
            {settings.school_contact_phone && <span>{settings.school_contact_phone}</span>}
          </div>
        </div>
      </div>

      <header className="spmb-header">
        <div className="spmb-container spmb-header-inner">
          <Link aria-label="SPMB SMK Nan Jaya, beranda" className="spmb-brand" href="/beranda">
            <SchoolMark />
            <span>
              <strong>SPMB SMK NAN JAYA</strong>
              <small>Sistem Penerimaan Murid Baru</small>
            </span>
          </Link>
          <nav aria-label="Navigasi utama" className="spmb-nav">
            <a className="spmb-nav-active" href="#beranda">Beranda</a>
            <a href="#jalur-penerimaan">Jalur Penerimaan</a>
            <a href="#persyaratan">Persyaratan</a>
            <a href="#pengumuman">Pengumuman</a>
            <a href="#pertanyaan">FAQ</a>
          </nav>
          <Link className="spmb-login-link" href={student ? "/profil" : "/"}>
            <UserIcon />
            {student ? "Profil Pengguna" : "Masuk Akun"}
          </Link>
        </div>
      </header>

      <section aria-labelledby="spmb-hero-title" className="spmb-hero" id="beranda">
        <div className="spmb-container spmb-hero-inner">
          <div className="spmb-hero-copy">
            <span className="spmb-hero-badge">
              <span className="spmb-badge-check"><CheckIcon /></span>
              Mudah, transparan, dan tanpa biaya
            </span>
            <h1 id="spmb-hero-title">
              Pilih program keahlian dan mulai pendaftaran SMK Nan Jaya.
            </h1>
            <p>
              Daftar SMK Nan Jaya secara daring, pantau proses seleksi, dan
              temukan informasi program keahlian, daya tampung, dan persyaratan
              pendaftaran dalam satu portal resmi yang aman untuk calon murid
              dan orang tua.
            </p>
            <div className="spmb-hero-actions">
              <Link className="spmb-primary-button" href="/daftar">
                Daftar SMK Nan Jaya
                <ArrowIcon />
              </Link>
              <a className="spmb-secondary-button" href="#jalur-penerimaan">
                Lihat Jalur Penerimaan
              </a>
            </div>
            <div className="spmb-trust-list">
              <span><CheckIcon /> Tanpa biaya pendaftaran</span>
              <span><CheckIcon /> Data terlindungi</span>
              <span><CheckIcon /> Proses transparan</span>
            </div>
          </div>
          <div className="spmb-hero-visual">
            <Image
              alt="Enam murid SMK Nan Jaya berfoto di depan gedung sekolah"
              className="spmb-hero-photo"
              fetchPriority="high"
              height={768}
              loading="eager"
              src="/images/smk-nan-jaya-school.png"
              width={1024}
            />
            <div className="spmb-photo-caption">
              <span className="spmb-caption-icon"><CheckIcon /></span>
              <span>
                <strong>Pendaftaran SMK Nan Jaya {academicYear}</strong>
                <small>Penerimaan murid baru dibuka. Pastikan data dan dokumenmu lengkap.</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="spmb-pathway-title" className="spmb-pathways" id="jalur-penerimaan">
        <div className="spmb-container">
          <div className="spmb-centered-heading">
            <span className="spmb-eyebrow">PILIH JENJANG</span>
            <h2 id="spmb-pathway-title">Temukan program keahlian SMK Nan Jaya</h2>
            <p>
              Jelajahi program keahlian, daya tampung, dan informasi pendaftaran
              SMK Nan Jaya untuk menemukan jalur yang paling sesuai.
            </p>
            <small className="spmb-program-note">
              Daya tampung mengikuti kuota aktif yang ditetapkan sekolah.
            </small>
          </div>
          <div className="spmb-pathway-grid">
            {pathwayCards.length ? pathwayCards.map((program) => (
              <article className="spmb-pathway-card" key={program.code}>
                <Link aria-label={`Daftar program ${program.title}`} className="spmb-pathway-image-link" href="/daftar">
                  <Image
                    alt={program.alt}
                    className="spmb-pathway-image"
                    height={250}
                    sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw"
                    src={program.image}
                    width={455}
                  />
                </Link>
                <div className="spmb-pathway-copy">
                  <div className="spmb-pathway-heading">
                    <span className="spmb-pathway-symbol" aria-hidden="true">{program.icon}</span>
                    <div className="spmb-pathway-title">
                      <h3>{program.title}</h3>
                      <span>Program keahlian unggulan</span>
                    </div>
                    <Link aria-label={`Lihat program ${program.title}`} className="spmb-pathway-arrow" href="/daftar">↗</Link>
                  </div>
                  <p className="spmb-pathway-capacity">{program.capacity} daya tampung tersedia</p>
                </div>
              </article>
            )) : <p className="spmb-empty-programs">Informasi jalur penerimaan belum tersedia.</p>}
          </div>
        </div>
      </section>

      <section aria-labelledby="spmb-requirements-title" className="spmb-requirements" id="persyaratan">
        <div className="spmb-container spmb-requirements-inner">
          <div className="spmb-document-art" aria-hidden="true">
            <div className="spmb-document-glow" />
            <div className="spmb-document-card">
              <strong><SchoolMark /> Checklist Pendaftaran</strong>
              <span><i /> Kartu Keluarga</span>
              <span><i /> Akta Kelahiran</span>
              <span><i /> Ijazah / Surat Keterangan Lulus</span>
              <span><i /> Pas foto calon murid</span>
              <div>✓ Semua dokumen siap diunggah</div>
            </div>
          </div>
          <div className="spmb-requirements-copy">
            <span className="spmb-eyebrow">PERSYARATAN PENDAFTARAN</span>
            <h2 id="spmb-requirements-title">Persyaratan pendaftaran SMK Nan Jaya</h2>
            <p>
              Siapkan dokumen berikut dengan jelas dan lengkap. Pendaftaran
              dilakukan melalui portal resmi SMK Nan Jaya.
            </p>
            <ul>
              <li><CheckIcon /> Kartu Keluarga</li>
              <li><CheckIcon /> Akta Kelahiran</li>
              <li><CheckIcon /> Ijazah atau surat keterangan lulus</li>
              <li><CheckIcon /> Pas foto calon murid</li>
              <li><CheckIcon /> Nomor telepon aktif</li>
            </ul>
            <small>Persyaratan tambahan akan diinformasikan melalui pengumuman resmi.</small>
          </div>
        </div>
      </section>

      <section aria-labelledby="spmb-stats-title" className="spmb-stats" id="ringkasan-layanan">
        <div className="spmb-container">
          <div className="spmb-stats-heading">
            <span className="spmb-eyebrow spmb-eyebrow-light">SMK NAN JAYA</span>
            <h2 id="spmb-stats-title">Profil penerimaan SMK Nan Jaya</h2>
            <p>Data penerimaan murid baru tahun ajaran {academicYear}.</p>
          </div>
          <div className="spmb-stats-grid">
            {stats.map((stat) => (
              <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="spmb-news-title" className="spmb-news" id="pengumuman">
        <div className="spmb-container">
          <div className="spmb-news-heading">
            <div>
              <span className="spmb-eyebrow">INFORMASI TERKINI</span>
              <h2 id="spmb-news-title">Pengumuman SMK Nan Jaya</h2>
              <p>Informasi resmi seputar penerimaan murid baru SMK Nan Jaya.</p>
            </div>
            <a href="#daftar-pengumuman"><ArrowIcon /> Lihat Semua</a>
          </div>
          <div className="spmb-news-grid" id="daftar-pengumuman">
            <article className="spmb-news-feature">
              <Image
                alt="Petugas sekolah membantu keluarga calon murid mengurus pendaftaran SPMB"
                height={198}
                src="/images/spmb-registration-support.png"
                sizes="(max-width: 700px) 100vw, 60vw"
                width={735}
              />
              <div>
                <div className="spmb-news-feature-meta">
                  <span className="spmb-news-priority">PENTING</span>
                  {latestAnnouncement?.published_at && (
                    <time dateTime={new Date(latestAnnouncement.published_at).toISOString()}>
                      {formatAnnouncementDate(latestAnnouncement.published_at)}
                    </time>
                  )}
                </div>
                <h3>{latestAnnouncement?.title || "Informasi pendaftaran SMK Nan Jaya"}</h3>
                <p>{latestAnnouncement?.body || "Pengumuman resmi mengenai proses penerimaan murid baru akan ditampilkan di sini."}</p>
              </div>
            </article>
            <div className="spmb-news-list">
              {announcements.slice(1).map((announcement) => (
                <article className="spmb-news-list-card" key={announcement.id}>
                  <span className="spmb-news-icon" aria-hidden="true"><ArrowIcon /></span>
                  <span className="spmb-news-item-copy">
                    <small className="spmb-news-item-meta">
                      {announcement.published_at ? formatAnnouncementDate(announcement.published_at) : "Informasi sekolah"}
                    </small>
                    <strong>{announcement.title}</strong>
                    <small>{announcement.body}</small>
                  </span>
                  <b aria-hidden="true">›</b>
                </article>
              ))}
              {!announcements.length && (
                <>
                  <Link className="spmb-news-list-card" href="/daftar">
                    <span className="spmb-news-icon"><NewsDocumentIcon /></span>
                    <span className="spmb-news-item-copy">
                      <small className="spmb-news-item-meta">PANDUAN</small>
                      <strong>Cara memperbaiki dokumen pendaftaran</strong>
                      <small>Lengkapi dan kirim kembali dokumen yang perlu diperbaiki.</small>
                    </span>
                    <b aria-hidden="true">›</b>
                  </Link>
                  <a className="spmb-news-list-card" href="#kontak">
                    <span className="spmb-news-icon"><NewsLocationIcon /></span>
                    <span className="spmb-news-item-copy">
                      <small className="spmb-news-item-meta">LAYANAN</small>
                      <strong>Lokasi dan jam layanan bantuan</strong>
                      <small>Hubungi sekolah untuk informasi bantuan pendaftaran.</small>
                    </span>
                    <b aria-hidden="true">›</b>
                  </a>
                </>
              )}
              {announcements.length === 1 && (
                <a className="spmb-news-list-card" href="#jalur-penerimaan">
                  <span className="spmb-news-icon" aria-hidden="true"><ArrowIcon /></span>
                  <span className="spmb-news-item-copy">
                    <small className="spmb-news-item-meta">PROGRAM KEAHLIAN</small>
                    <strong>Kenali pilihan jurusan</strong>
                    <small>Temukan program keahlian yang sesuai dengan minatmu.</small>
                  </span>
                  <b aria-hidden="true">›</b>
                </a>
              )}
              {announcements.length === 2 && (
                <a className="spmb-news-list-card" href="#jalur-penerimaan">
                  <span className="spmb-news-icon" aria-hidden="true"><ArrowIcon /></span>
                  <span className="spmb-news-item-copy">
                    <small className="spmb-news-item-meta">PROGRAM KEAHLIAN</small>
                    <strong>Kenali pilihan jurusan</strong>
                    <small>Temukan program keahlian yang sesuai dengan minatmu.</small>
                  </span>
                  <b aria-hidden="true">›</b>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="spmb-faq-title" className="spmb-faq" id="pertanyaan">
        <div className="spmb-container spmb-faq-inner">
          <div className="spmb-faq-intro">
            <span className="spmb-eyebrow">FAQ</span>
            <h2 id="spmb-faq-title">Pertanyaan umum pendaftaran SMK Nan Jaya</h2>
            <p>
              Temukan jawaban singkat seputar akun, program keahlian,
              verifikasi, dan hasil seleksi SMK Nan Jaya.
            </p>
            <div className="spmb-security-note">
              <strong><span aria-hidden="true">♙</span> Jaga keamanan akun</strong>
              <p>Petugas tidak pernah meminta kata sandi atau kode OTP. Gunakan hanya portal resmi SPMB.</p>
            </div>
          </div>
          <div className="spmb-faq-list">
            {faqs.map((faq, index) => (
              <details className="spmb-faq-item" key={faq.question} open={index === 0}>
                <summary>
                  {faq.question}
                  <span aria-hidden="true" />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="spmb-help-title" className="spmb-help" id="kontak">
        <div className="spmb-help-decoration" aria-hidden="true"><i /><i /><i /></div>
        <div className="spmb-help-copy">
          <span className="spmb-eyebrow spmb-eyebrow-light">PUSAT BANTUAN</span>
          <h2 id="spmb-help-title">Butuh bantuan menyelesaikan pendaftaran SMK Nan Jaya?</h2>
          <p>
            Mulai pendaftaran melalui portal resmi atau hubungi sekolah melalui
            informasi kontak yang tersedia.
          </p>
          <Link className="spmb-help-button" href="/daftar">
            Mulai Pendaftaran
            <ArrowIcon />
          </Link>
        </div>
        <div className="spmb-help-contacts">
          {contactPhone && (
            <a href={`tel:${contactPhoneLink}`}>
              <span className="spmb-contact-icon contact-whatsapp">☎</span>
              <span><strong>Telepon / WhatsApp</strong><small>{contactPhone}</small></span>
            </a>
          )}
          {settings.school_contact_email && (
            <a href={`mailto:${settings.school_contact_email}`}>
              <span className="spmb-contact-icon contact-location">✉</span>
              <span><strong>Email sekolah</strong><small>{settings.school_contact_email}</small></span>
            </a>
          )}
          {!contactPhone && !settings.school_contact_email && (
            <div>
              <span className="spmb-contact-icon contact-location">i</span>
              <span><strong>Informasi kontak</strong><small>Kontak sekolah belum tersedia.</small></span>
            </div>
          )}
        </div>
      </section>

      <footer className="spmb-footer">
        <div className="spmb-container">
          <div className="spmb-footer-main">
            <div className="spmb-footer-about">
              <Link aria-label="SPMB SMK Nan Jaya, beranda" className="spmb-brand spmb-brand-footer" href="/beranda">
                <SchoolMark />
                <span><strong>SMK NAN JAYA</strong><small>Penerimaan Murid Baru</small></span>
              </Link>
              <p>
                Portal layanan resmi penerimaan murid baru yang transparan,
                inklusif, dan mudah diakses oleh seluruh keluarga.
              </p>
              <strong className="spmb-footer-school">SMK Nan Jaya</strong>
            </div>
            <div className="spmb-footer-column">
              <strong>Layanan</strong>
              <Link href="/daftar">Daftar Akun</Link>
              <Link href={student ? "/profil" : "/"}>Masuk Akun</Link>
              <a href="#jalur-penerimaan">Pilih Jurusan</a>
              <a href="#persyaratan">Persyaratan</a>
            </div>
            <div className="spmb-footer-column">
              <strong>Informasi</strong>
              <a href="#ringkasan-layanan">Ringkasan Layanan</a>
              <a href="#persyaratan">Persyaratan</a>
              <a href="#pengumuman">Pengumuman</a>
              <a href="#pertanyaan">Pertanyaan Umum</a>
            </div>
            <div className="spmb-footer-column spmb-footer-contact">
              <strong>Kontak resmi</strong>
              {contactPhone && <a href={`tel:${contactPhoneLink}`}>☎ &nbsp; {contactPhone}</a>}
              {settings.school_contact_email && <a href={`mailto:${settings.school_contact_email}`}>✉ &nbsp; {settings.school_contact_email}</a>}
              {!contactPhone && !settings.school_contact_email && <span>Kontak sekolah belum tersedia.</span>}
            </div>
          </div>
          <div className="spmb-footer-bottom">
            <span>© {new Date().getFullYear()} SMK Nan Jaya. Semua hak dilindungi.</span>
            <div><a href="#beranda">Kembali ke atas</a><a href="#kontak">Pusat bantuan</a></div>
          </div>
        </div>
      </footer>
    </main>
  );
}
